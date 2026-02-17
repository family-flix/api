package javbus

import (
	"crypto/tls"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/spf13/viper"
)

const (
	ua   = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
	host = "https://www.javbus.com"
)

type Movie struct {
	Code    string
	Title   string
	Cover   string
	Link    string
	AirDate string
}

type Actor struct {
	Name   string
	Avatar string
}

type MovieDetail struct {
	Code         string
	Title        string
	Cover        string
	Backdrop     string
	ReleaseDate  string
	Length       string
	Director     string
	Studio       string
	Label        string
	Genres       []string
	Actors       []Actor
	SampleImages []string
}

type JavBusClient struct {
	client     *http.Client
	cookie     string
	cookieFile string
	proxyHost  string // Cloudflare Worker URL, e.g. "https://xxx.workers.dev"
}

func NewJavBusClient(cookieFile string) *JavBusClient {
	if cookieFile == "" {
		cookieFile = "javbus.cookie"
	}
	return &JavBusClient{
		client: &http.Client{
			Timeout: 30 * time.Second,
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{},
				ForceAttemptHTTP2: false,
				TLSNextProto:     make(map[string]func(authority string, c *tls.Conn) http.RoundTripper),
				DialContext: (&net.Dialer{
					Timeout:   10 * time.Second,
					KeepAlive: 30 * time.Second,
				}).DialContext,
			},
		},
		cookieFile: cookieFile,
		proxyHost:  strings.TrimRight(getProxy(), "/"),
	}
}

// proxyURL wraps targetURL through the Cloudflare Worker proxy if configured.
// e.g. https://worker.dev/api/proxy/?u=<encoded_target>
func getProxy() string {
	if v := os.Getenv("JAVBUS_PROXY"); v != "" {
		return v
	}
	return viper.GetString("javbus.proxy")
}

func (c *JavBusClient) proxyURL(targetURL string) string {
	if c.proxyHost != "" {
		return c.proxyHost + "/api/proxy/?u=" + url.QueryEscape(targetURL)
	}
	return targetURL
}

type JavBusSearchResp struct {
	Data     []Movie
	NextPage bool
}

func (c *JavBusClient) LoadCookie() error {
	data, err := os.ReadFile(c.cookieFile)
	if err != nil {
		return err
	}
	c.cookie = strings.TrimSpace(string(data))
	fmt.Printf("Loaded cookie from %s\n", c.cookieFile)
	return nil
}

func (c *JavBusClient) SaveCookie() error {
	fmt.Printf("Saving cookie to %s\n", c.cookieFile)
	return os.WriteFile(c.cookieFile, []byte(c.cookie), 0644)
}

func (c *JavBusClient) GetCookie() string {
	return c.cookie
}

func (c *JavBusClient) Verify() error {
	vp := host + "/doc/driver-verify?referer=https%3A%2F%2Fwww.javbus.com%2F"

	// Step 1: GET to get PHPSESSID
	req1, _ := http.NewRequest("GET", c.proxyURL(vp), nil)
	req1.Header.Set("User-Agent", ua)
	req1.Header.Set("Accept", "text/html")

	resp1, err := c.client.Do(req1)
	if err != nil {
		return err
	}
	defer resp1.Body.Close()

	sc := resp1.Header.Get("Set-Cookie")
	// JS: var sm = sc.match(/PHPSESSID=([^;]+)/);
	re := regexp.MustCompile(`PHPSESSID=([^;]+)`)
	matches := re.FindStringSubmatch(sc)
	sid := ""
	if len(matches) > 1 {
		sid = matches[1]
	}

	// Step 2: POST to verify
	data := url.Values{}
	data.Set("Submit", "確認")

	req2, _ := http.NewRequest("POST", c.proxyURL(vp), strings.NewReader(data.Encode()))
	req2.Header.Set("User-Agent", ua)
	req2.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req2.Header.Set("Cookie", "PHPSESSID="+sid)
	req2.Header.Set("Origin", host)
	req2.Header.Set("Referer", vp)

	resp2, err := c.client.Do(req2)
	if err != nil {
		return err
	}
	defer resp2.Body.Close()

	c.cookie = "PHPSESSID=" + sid + "; age=verified; existmag=all"
	return c.SaveCookie()
}

func (c *JavBusClient) ensureCookie() error {
	if c.cookie == "" {
		_ = c.LoadCookie()
		if c.cookie == "" {
			if err := c.Verify(); err != nil {
				return fmt.Errorf("verification failed: %w", err)
			}
		}
	}
	return nil
}

func (c *JavBusClient) Search(kw string, page int) (*JavBusSearchResp, error) {
	if err := c.ensureCookie(); err != nil {
		return nil, err
	}

	searchURL := fmt.Sprintf("%s/search/%s", host, url.PathEscape(kw))
	if page > 1 {
		searchURL = fmt.Sprintf("%s/%d", searchURL, page)
	}

	headers := map[string]string{
		"User-Agent":                ua,
		"Accept":                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
		"Accept-Language":           "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
		"Cookie":                    c.cookie,
		"Referer":                   host + "/",
		"Sec-Fetch-Dest":            "document",
		"Sec-Fetch-Mode":            "navigate",
		"Sec-Fetch-Site":            "same-origin",
		"Upgrade-Insecure-Requests": "1",
	}

	body, err := c.fetch(searchURL, headers)
	if err != nil {
		return nil, err
	}

	movies := c.parse(body)

	// Check for next page existence
	nextPageStr := fmt.Sprintf("/%d\"", page+1)
	nextPageStr2 := fmt.Sprintf("page=%d", page+1)
	hasNext := strings.Contains(body, nextPageStr) || strings.Contains(body, nextPageStr2)

	return &JavBusSearchResp{
		Data:     movies,
		NextPage: hasNext,
	}, nil
}

func (c *JavBusClient) GetMovieDetail(code string) (*MovieDetail, error) {
	if err := c.ensureCookie(); err != nil {
		return nil, err
	}

	detailURL := fmt.Sprintf("%s/%s", host, code)
	headers := map[string]string{
		"User-Agent":                ua,
		"Accept":                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
		"Accept-Language":           "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
		"Cookie":                    c.cookie,
		"Referer":                   host + "/",
		"Sec-Fetch-Dest":            "document",
		"Sec-Fetch-Mode":            "navigate",
		"Sec-Fetch-Site":            "same-origin",
		"Upgrade-Insecure-Requests": "1",
	}

	body, err := c.fetch(detailURL, headers)
	if err != nil {
		return nil, err
	}

	return c.parseDetail(code, body), nil
}

func (c *JavBusClient) fetch(urlStr string, headers map[string]string) (string, error) {
	req, err := http.NewRequest("GET", c.proxyURL(urlStr), nil)
	if err != nil {
		return "", err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := c.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	return string(bodyBytes), nil
}

func (c *JavBusClient) parse(html string) []Movie {
	var movies []Movie
	// JS: <a\\s+class="movie-box"[^>]*href="([^"]*)"[^>]*>([\\s\\S]*?)</a>
	reBox := regexp.MustCompile(`(?i)<a\s+class="movie-box"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)</a>`)

	// Inner regexes
	reImgSrc := regexp.MustCompile(`(?i)<img[^>]*src="([^"]*)"`)
	reImgTitle := regexp.MustCompile(`(?i)<img[^>]*title="([^"]*)"`)
	reDate := regexp.MustCompile(`(?i)<date>([^<]*)<\/date>`)

	matches := reBox.FindAllStringSubmatch(html, -1)
	for _, m := range matches {
		link := m[1]
		content := m[2]

		// Parse inner content
		cover := ""
		if imgM := reImgSrc.FindStringSubmatch(content); len(imgM) > 1 {
			cover = imgM[1]
		}

		title := ""
		if titleM := reImgTitle.FindStringSubmatch(content); len(titleM) > 1 {
			title = titleM[1]
		}

		code := ""
		airDate := ""
		dateMatches := reDate.FindAllStringSubmatch(content, -1)
		if len(dateMatches) > 0 {
			code = strings.TrimSpace(dateMatches[0][1])
		}
		if len(dateMatches) > 1 {
			airDate = strings.TrimSpace(dateMatches[1][1])
		}

		if code != "" {
			movies = append(movies, Movie{
				Code:    code,
				Title:   title,
				Cover:   fullURL(cover),
				Link:    link,
				AirDate: airDate,
			})
		}
	}
	return movies
}

func (c *JavBusClient) parseDetail(code, html string) *MovieDetail {
	detail := &MovieDetail{Code: code}

	// Title
	// Try to match exact code first to avoid partial matches, though javbus title usually starts with code.
	// <h3>CODE Title...</h3>
	reTitle := regexp.MustCompile(`(?i)<h3>` + regexp.QuoteMeta(code) + `\s+(.*?)</h3>`)
	if m := reTitle.FindStringSubmatch(html); len(m) > 1 {
		detail.Title = m[1]
	} else {
		// Fallback: try to find any h3 if code match fails (e.g. if code in title is formatted differently)
		reH3 := regexp.MustCompile(`(?i)<h3>(.*?)</h3>`)
		if m := reH3.FindStringSubmatch(html); len(m) > 1 {
			detail.Title = strings.TrimPrefix(m[1], code+" ")
		}
	}

	// Cover & Backdrop
	reCover := regexp.MustCompile(`(?i)<a class="bigImage" href="([^"]*)"[^>]*>\s*<img src="([^"]*)"`)
	if m := reCover.FindStringSubmatch(html); len(m) > 2 {
		detail.Backdrop = fullURL(m[1])
		detail.Cover = fullURL(m[2])
	}

	// Release Date
	reDate := regexp.MustCompile(`(?i)<span class="header">發行日期:</span>\s*([^<]+)`)
	if m := reDate.FindStringSubmatch(html); len(m) > 1 {
		detail.ReleaseDate = strings.TrimSpace(m[1])
	}

	// Length
	reLength := regexp.MustCompile(`(?i)<span class="header">長度:</span>\s*([^<]+)`)
	if m := reLength.FindStringSubmatch(html); len(m) > 1 {
		detail.Length = strings.TrimSpace(m[1])
	}

	// Director
	reDirector := regexp.MustCompile(`(?i)<span class="header">導演:</span>\s*<a[^>]*>([^<]*)</a>`)
	if m := reDirector.FindStringSubmatch(html); len(m) > 1 {
		detail.Director = strings.TrimSpace(m[1])
	}

	// Studio
	reStudio := regexp.MustCompile(`(?i)<span class="header">製作商:</span>\s*<a[^>]*>([^<]*)</a>`)
	if m := reStudio.FindStringSubmatch(html); len(m) > 1 {
		detail.Studio = strings.TrimSpace(m[1])
	}

	// Label
	reLabel := regexp.MustCompile(`(?i)<span class="header">發行商:</span>\s*<a[^>]*>([^<]*)</a>`)
	if m := reLabel.FindStringSubmatch(html); len(m) > 1 {
		detail.Label = strings.TrimSpace(m[1])
	}

	// Genres
	reGenre := regexp.MustCompile(`(?i)<span class="genre"><label><input[^>]*><a[^>]*>([^<]*)</a></label></span>`)
	genreMatches := reGenre.FindAllStringSubmatch(html, -1)
	for _, m := range genreMatches {
		detail.Genres = append(detail.Genres, strings.TrimSpace(m[1]))
	}

	// Actors
	reActor := regexp.MustCompile(`(?i)<a[^>]*href="https?://www\.javbus\.com/star/([^"]*)"[^>]*>([^<]*)</a>`)
	actorMatches := reActor.FindAllStringSubmatch(html, -1)
	seen := make(map[string]bool)
	for _, m := range actorMatches {
		name := strings.TrimSpace(m[2])
		if name == "" || seen[name] {
			continue
		}
		seen[name] = true
		detail.Actors = append(detail.Actors, Actor{
			Name:   name,
			Avatar: host + "/pics/actress/" + m[1] + "_a.jpg",
		})
	}

	// Sample Images
	reSample := regexp.MustCompile(`(?i)<a class="sample-box" href="([^"]*)"`)
	sampleMatches := reSample.FindAllStringSubmatch(html, -1)
	for _, m := range sampleMatches {
		detail.SampleImages = append(detail.SampleImages, fullURL(m[1]))
	}

	return detail
}

func fullURL(s string) string {
	if s != "" && strings.HasPrefix(s, "/") {
		return host + s
	}
	return s
}

func uniqueStrings(slice []string) []string {
	keys := make(map[string]bool)
	list := []string{}
	for _, entry := range slice {
		if _, value := keys[entry]; !value {
			keys[entry] = true
			list = append(list, entry)
		}
	}
	return list
}
