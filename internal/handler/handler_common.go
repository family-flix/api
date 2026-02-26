package handler

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"github.com/family-flix/api/internal/assets"
	"github.com/family-flix/api/internal/domain/user"
	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/pkg/media_profile/javbus"
	"io"
	"mime"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
)

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func rid() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)[:15]
}

var videoExts = map[string]bool{
	".mp4": true, ".mkv": true, ".avi": true, ".mov": true, ".wmv": true, ".flv": true, ".webm": true, ".m4v": true,
}

func isVideo(path string) bool {
	return videoExts[strings.ToLower(filepath.Ext(path))]
}

// authAdmin extracts the Authorization header and returns the authenticated admin user.
func authAdmin(c Context) (*user.User, error) {
	return user.New(c.Header("Authorization"), c.DB())
}

// authMember extracts the Authorization header and returns the authenticated member.
func authMember(c Context) (*model.Member, *model.MemberToken, error) {
	token := c.Header("Authorization")
	if token == "" {
		return nil, nil, fmt.Errorf("缺少 token")
	}
	var mt model.MemberToken
	if err := c.DB().Where("token = ?", token).First(&mt).Error; err != nil {
		return nil, nil, fmt.Errorf("无效的 token")
	}
	var m model.Member
	if err := c.DB().Where("id = ? AND `delete` = 0", mt.MemberID).First(&m).Error; err != nil {
		return nil, nil, fmt.Errorf("无效的成员")
	}
	return &m, &mt, nil
}

type R map[string]interface{}

func ok(c Context, msg string, data interface{}) error {
	return c.JSON(http.StatusOK, R{"code": 0, "msg": msg, "data": data})
}

func fail(c Context, code int, msg string) error {
	return c.JSON(http.StatusOK, R{"code": code, "msg": msg, "data": nil})
}

func Ping(c Context) error {
	return ok(c, "ok", nil)
}

func Favicon(c Context) error {
	return c.Stream(http.StatusOK, "image/x-icon", bytes.NewReader(assets.Favicon))
}

func Proxy(c Context) error {
	return nil
}

func ProxyJavbus(c Context) error {
	urlStr := c.QueryParam("url")
	if urlStr == "" {
		return fail(c, 400, "缺少 url 参数")
	}

	var cachePath string
	if u, err := url.Parse(urlStr); err == nil {
		filename := filepath.Base(u.Path)
		if filename != "" && filename != "." && filename != "/" {
			cachePath = filepath.Join(c.BaseDir(), "data", "thumbnail", filename)
			if _, err := os.Stat(cachePath); err == nil {
				if f, err := os.Open(cachePath); err == nil {
					defer f.Close()
					contentType := mime.TypeByExtension(filepath.Ext(filename))
					if contentType == "" {
						contentType = "image/jpeg"
					}
					return c.Stream(http.StatusOK, contentType, f)
				}
			}
		}
	}

	jc := javbus.NewJavBusClient("")
	_ = jc.LoadCookie()
	req, err := http.NewRequest("GET", urlStr, nil)
	if err != nil {
		return fail(c, 500, "构建请求失败")
	}
	req.Header.Set("Referer", "https://www.javbus.com/")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36")
	if cookie := jc.GetCookie(); cookie != "" {
		req.Header.Set("Cookie", cookie)
	}
	resp, err := jc.Do(req)
	if err != nil {
		return fail(c, 500, "请求图片失败")
	}
	defer resp.Body.Close()

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "image/jpeg"
	}

	if resp.StatusCode == http.StatusOK && cachePath != "" {
		if err := os.MkdirAll(filepath.Dir(cachePath), 0755); err == nil {
			f, err := os.Create(cachePath)
			if err == nil {
				defer f.Close()
				err = c.Stream(resp.StatusCode, contentType, io.TeeReader(resp.Body, f))
				if err != nil {
					os.Remove(cachePath)
					return err
				}
				return nil
			}
		}
	}

	return c.Stream(resp.StatusCode, contentType, resp.Body)
}
