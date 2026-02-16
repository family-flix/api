package tmdb

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"sync"

	"github.com/family-flix/api/pkg/types"
)

const (
	DefaultHostname = "https://proxy.funzm.com/api/tmdb/3"
	DefaultToken    = "c2e5d34999e27f8e0ef18421aa5dec38"
	DefaultLanguage = "zh-CN"
)

type Language string

const (
	LanguageZhCN Language = "zh-CN"
	LanguageEnUS Language = "en-US"
)

type Client struct {
	hostname   string
	token      string
	language   Language
	httpClient *http.Client
	tvCache    map[string]*SearchResult
	movieCache map[string]*MovieSearchResult
	mu         sync.RWMutex
}

type Option func(*Client)

func WithToken(token string) Option {
	return func(c *Client) {
		c.token = token
	}
}

func WithHostname(hostname string) Option {
	return func(c *Client) {
		c.hostname = hostname
	}
}

func WithLanguage(language Language) Option {
	return func(c *Client) {
		c.language = language
	}
}

func NewClient(opts ...Option) *Client {
	c := &Client{
		hostname:   DefaultHostname,
		token:      DefaultToken,
		language:   DefaultLanguage,
		httpClient: &http.Client{},
		tvCache:    make(map[string]*SearchResult),
		movieCache: make(map[string]*MovieSearchResult),
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

type SearchResult struct {
	Total int
	Page  int
	List  []types.TVProfile
}

type MovieSearchResult struct {
	Total int
	Page  int
	List  []types.MovieProfile
}

// SeasonProfileResult matches fetch_season_profile_process output
type SeasonProfileResult struct {
	ID           int                    `json:"id"`
	Name         string                 `json:"name"`
	Number       int                    `json:"number"`
	AirDate      string                 `json:"air_date"`
	Overview     string                 `json:"overview"`
	SeasonNumber int                    `json:"season_number"`
	PosterPath   string                 `json:"poster_path"`
	Episodes     []SeasonEpisodeResult  `json:"episodes"`
}

type SeasonEpisodeResult struct {
	ID            int    `json:"id"`
	Name          string `json:"name"`
	Overview      string `json:"overview"`
	AirDate       string `json:"air_date"`
	EpisodeNumber int    `json:"episode_number"`
	SeasonNumber  int    `json:"season_number"`
	Runtime       int    `json:"runtime"`
	StillPath     string `json:"still_path"`
}

// EpisodeProfileResult matches fetch_episode_profile_process output
type EpisodeProfileResult struct {
	ID            int    `json:"id"`
	Name          string `json:"name"`
	AirDate       string `json:"air_date"`
	Overview      string `json:"overview"`
	SeasonNumber  int    `json:"season_number"`
	EpisodeNumber int    `json:"episode_number"`
	Runtime       int    `json:"runtime"`
}

// PersonProfileItem matches fetch_persons_of_*_process output
type PersonProfileItem struct {
	ID                 int    `json:"id"`
	Name               string `json:"name"`
	Gender             int    `json:"gender"`
	ProfilePath        string `json:"profile_path"`
	KnownForDepartment string `json:"known_for_department"`
	Order              int    `json:"order"`
}

// PersonProfileResult matches fetch_person_profile_process output
type PersonProfileResult struct {
	ID                 int    `json:"id"`
	Name               string `json:"name"`
	Biography          string `json:"biography"`
	ProfilePath        string `json:"profile_path"`
	PlaceOfBirth       string `json:"place_of_birth"`
	Birthday           string `json:"birthday"`
	KnownForDepartment string `json:"known_for_department"`
}

// --- raw TMDB API response structs ---

type tvDetailResp struct {
	ID               int           `json:"id"`
	Name             *string       `json:"name"`
	OriginalName     *string       `json:"original_name"`
	Overview         *string       `json:"overview"`
	FirstAirDate     *string       `json:"first_air_date"`
	PosterPath       *string       `json:"poster_path"`
	BackdropPath     *string       `json:"backdrop_path"`
	VoteAverage      *float64      `json:"vote_average"`
	Popularity       float64       `json:"popularity"`
	NumberOfEpisodes int           `json:"number_of_episodes"`
	NumberOfSeasons  int           `json:"number_of_seasons"`
	InProduction     bool          `json:"in_production"`
	NextEpisodeToAir *string       `json:"next_episode_to_air"`
	Seasons          []seasonResp  `json:"seasons"`
	Genres           []types.Genre `json:"genres"`
	OriginCountry    []string      `json:"origin_country"`
}

type seasonResp struct {
	ID           int     `json:"id"`
	AirDate      string  `json:"air_date"`
	EpisodeCount int     `json:"episode_count"`
	Name         string  `json:"name"`
	Overview     *string `json:"overview"`
	PosterPath   *string `json:"poster_path"`
	SeasonNumber int     `json:"season_number"`
}

type seasonDetailResp struct {
	ID           int           `json:"id"`
	Name         string        `json:"name"`
	Overview     string        `json:"overview"`
	AirDate      string        `json:"air_date"`
	SeasonNumber int           `json:"season_number"`
	PosterPath   *string       `json:"poster_path"`
	Episodes     []episodeResp `json:"episodes"`
}

type episodeResp struct {
	ID            int     `json:"id"`
	Name          string  `json:"name"`
	Overview      string  `json:"overview"`
	AirDate       string  `json:"air_date"`
	EpisodeNumber int     `json:"episode_number"`
	SeasonNumber  int     `json:"season_number"`
	Runtime       int     `json:"runtime"`
	StillPath     *string `json:"still_path"`
}

type movieDetailResp struct {
	ID                  int           `json:"id"`
	Title               string        `json:"title"`
	OriginalTitle       *string       `json:"original_title"`
	Overview            *string       `json:"overview"`
	PosterPath          *string       `json:"poster_path"`
	BackdropPath        *string       `json:"backdrop_path"`
	ReleaseDate         *string       `json:"release_date"`
	Status              string        `json:"status"`
	VoteAverage         float64       `json:"vote_average"`
	Popularity          float64       `json:"popularity"`
	Runtime             *int          `json:"runtime"`
	Genres              []types.Genre `json:"genres"`
	ProductionCountries []countryResp `json:"production_countries"`
}

type countryResp struct {
	ISO31661 string `json:"iso_3166_1"`
}

type creditsResp struct {
	Cast []personResp `json:"cast"`
	Crew []personResp `json:"crew"`
}

type personResp struct {
	ID                 int     `json:"id"`
	Name               string  `json:"name"`
	Gender             int     `json:"gender"`
	ProfilePath        *string `json:"profile_path"`
	KnownForDepartment string  `json:"known_for_department"`
	Order              int     `json:"order"`
}

type personDetailResp struct {
	ID                 int      `json:"id"`
	Name               string   `json:"name"`
	AlsoKnownAs        []string `json:"also_known_as"`
	Biography          string   `json:"biography"`
	Birthday           string   `json:"birthday"`
	PlaceOfBirth       string   `json:"place_of_birth"`
	ProfilePath        *string  `json:"profile_path"`
	KnownForDepartment string   `json:"known_for_department"`
}

func (c *Client) buildURL(endpoint string) string {
	return c.hostname + endpoint
}

func (c *Client) doRequest(endpoint string, query url.Values) ([]byte, error) {
	if query == nil {
		query = url.Values{}
	}
	query.Set("api_key", c.token)
	query.Set("language", string(c.language))

	req, err := http.NewRequest("GET", c.buildURL(endpoint)+"?"+query.Encode(), nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("request failed with status: %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	if statusCode, ok := result["status_code"].(float64); ok && statusCode != 200 {
		if statusMsg, ok := result["status_message"].(string); ok {
			return nil, fmt.Errorf("tmdb error: %s", statusMsg)
		}
		return nil, fmt.Errorf("tmdb error: %d", int(statusCode))
	}

	return json.Marshal(result)
}

func fixTMDBImagePath(path *string) string {
	if path == nil || *path == "" {
		return ""
	}
	return "https://www.themoviedb.org/t/p/w600_and_h900_bestv2" + *path
}

func fixTMDBImagePathStr(path string) string {
	if path == "" {
		return ""
	}
	return "https://www.themoviedb.org/t/p/w600_and_h900_bestv2" + path
}

func fixTMDBBackdropPath(path *string) string {
	if path == nil || *path == "" {
		return ""
	}
	return "https://www.themoviedb.org/t/p/w1920_and_h800_multi_faces" + *path
}

func fixTMDBBackdropPathStr(path string) string {
	if path == "" {
		return ""
	}
	return "https://www.themoviedb.org/t/p/w1920_and_h800_multi_faces" + path
}

func fixTMDBStillPath(path *string) string {
	if path == nil || *path == "" {
		return ""
	}
	return "https://www.themoviedb.org/t/p/w227_and_h127_bestv2" + *path
}

func fixTMDBProfilePath(path *string) string {
	if path == nil || *path == "" {
		return ""
	}
	return "https://www.themoviedb.org/t/p/w600_and_h900_bestv2" + *path
}

func derefStr(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func derefFloat(p *float64) float64 {
	if p == nil {
		return 0
	}
	return *p
}

func (c *Client) SearchTV(keyword string, page int) (*SearchResult, error) {
	c.mu.RLock()
	cacheKey := fmt.Sprintf("%s/%d", keyword, page)
	if cached, ok := c.tvCache[cacheKey]; ok {
		c.mu.RUnlock()
		return cached, nil
	}
	c.mu.RUnlock()

	query := url.Values{}
	query.Set("query", keyword)
	query.Set("include_adult", "false")
	if page > 0 {
		query.Set("page", strconv.Itoa(page))
	}

	data, err := c.doRequest("/search/tv", query)
	if err != nil {
		return nil, err
	}

	var resp struct {
		Page         int `json:"page"`
		TotalResults int `json:"total_results"`
		Results      []struct {
			ID            int      `json:"id"`
			Name          string   `json:"name"`
			OriginalName  string   `json:"original_name"`
			Overview      string   `json:"overview"`
			PosterPath    *string  `json:"poster_path"`
			BackdropPath  *string  `json:"backdrop_path"`
			FirstAirDate  *string  `json:"first_air_date"`
			OriginCountry []string `json:"origin_country"`
		} `json:"results"`
	}

	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, err
	}

	result := &SearchResult{
		Page:  resp.Page,
		Total: resp.TotalResults,
		List:  make([]types.TVProfile, 0, len(resp.Results)),
	}

	for _, item := range resp.Results {
		originCountry := item.OriginCountry
		if originCountry == nil {
			originCountry = []string{}
		}
		profile := types.TVProfile{
			ID:            strconv.Itoa(item.ID),
			Name:          item.Name,
			OriginalName:  item.OriginalName,
			Overview:      item.Overview,
			PosterPath:    fixTMDBImagePath(item.PosterPath),
			BackdropPath:  fixTMDBBackdropPath(item.BackdropPath),
			OriginCountry: originCountry,
			Type:          "tv",
			Source:        "tmdb",
		}
		if item.FirstAirDate != nil {
			profile.FirstAirDate = *item.FirstAirDate
		}
		result.List = append(result.List, profile)
	}

	c.mu.Lock()
	c.tvCache[cacheKey] = result
	c.mu.Unlock()

	return result, nil
}

func (c *Client) SearchMovie(keyword string, page int) (*MovieSearchResult, error) {
	c.mu.RLock()
	cacheKey := fmt.Sprintf("%s/%d", keyword, page)
	if cached, ok := c.movieCache[cacheKey]; ok {
		c.mu.RUnlock()
		return cached, nil
	}
	c.mu.RUnlock()

	query := url.Values{}
	query.Set("query", keyword)
	query.Set("include_adult", "false")
	if page > 0 {
		query.Set("page", strconv.Itoa(page))
	}

	data, err := c.doRequest("/search/movie", query)
	if err != nil {
		return nil, err
	}

	var resp struct {
		Page         int `json:"page"`
		TotalResults int `json:"total_results"`
		Results      []struct {
			ID            int     `json:"id"`
			Title         string  `json:"title"`
			OriginalTitle string  `json:"original_title"`
			Overview      string  `json:"overview"`
			PosterPath    *string `json:"poster_path"`
			BackdropPath  *string `json:"backdrop_path"`
			ReleaseDate   *string `json:"release_date"`
		} `json:"results"`
	}

	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, err
	}

	result := &MovieSearchResult{
		Page:  resp.Page,
		Total: resp.TotalResults,
		List:  make([]types.MovieProfile, 0, len(resp.Results)),
	}

	for _, item := range resp.Results {
		profile := types.MovieProfile{
			ID:            strconv.Itoa(item.ID),
			Name:          item.Title,
			OriginalName:  item.OriginalTitle,
			Overview:      item.Overview,
			PosterPath:    fixTMDBImagePath(item.PosterPath),
			BackdropPath:  fixTMDBBackdropPath(item.BackdropPath),
			OriginCountry: []string{},
			Type:          "movie",
			Source:        "tmdb",
		}
		if item.ReleaseDate != nil {
			profile.AirDate = *item.ReleaseDate
		}
		result.List = append(result.List, profile)
	}

	c.mu.Lock()
	c.movieCache[cacheKey] = result
	c.mu.Unlock()

	return result, nil
}

func (c *Client) GetTVDetails(id string) (*types.TVProfile, error) {
	tvID, err := strconv.Atoi(id)
	if err != nil {
		return nil, err
	}
	return c.FetchTVProfile(tvID)
}

func (c *Client) GetMovieDetails(id string) (*types.MovieProfile, error) {
	movieID, err := strconv.Atoi(id)
	if err != nil {
		return nil, err
	}
	return c.FetchMovieProfile(movieID)
}

func (c *Client) FetchTVProfile(id int) (*types.TVProfile, error) {
	data, err := c.doRequest(fmt.Sprintf("/tv/%d", id), nil)
	if err != nil {
		return nil, err
	}

	var detail tvDetailResp
	if err := json.Unmarshal(data, &detail); err != nil {
		return nil, err
	}

	name := derefStr(detail.Name)
	if name == "" {
		name = derefStr(detail.OriginalName)
	}

	seasons := make([]types.TVProfileSeason, 0, len(detail.Seasons))
	for _, s := range detail.Seasons {
		seasons = append(seasons, types.TVProfileSeason{
			ID:           s.ID,
			AirDate:      s.AirDate,
			EpisodeCount: s.EpisodeCount,
			Name:         s.Name,
			Overview:     derefStr(s.Overview),
			PosterPath:   fixTMDBImagePath(s.PosterPath),
			SeasonNumber: s.SeasonNumber,
		})
	}

	profile := &types.TVProfile{
		ID:               strconv.Itoa(detail.ID),
		Name:             name,
		OriginalName:     derefStr(detail.OriginalName),
		Overview:         derefStr(detail.Overview),
		PosterPath:       fixTMDBImagePath(detail.PosterPath),
		BackdropPath:     fixTMDBBackdropPath(detail.BackdropPath),
		FirstAirDate:     derefStr(detail.FirstAirDate),
		VoteAverage:      derefFloat(detail.VoteAverage),
		Popularity:       detail.Popularity,
		NumberOfEpisodes: detail.NumberOfEpisodes,
		NumberOfSeasons:  detail.NumberOfSeasons,
		InProduction:     detail.InProduction,
		NextEpisodeToAir: detail.NextEpisodeToAir,
		Seasons:          seasons,
		Genres:           detail.Genres,
		OriginCountry:    detail.OriginCountry,
		Type:             "tv",
		Source:           "tmdb",
	}

	return profile, nil
}

func (c *Client) FetchSeasonProfile(tvID int, seasonNumber int) (*SeasonProfileResult, error) {
	data, err := c.doRequest(fmt.Sprintf("/tv/%d/season/%d", tvID, seasonNumber), nil)
	if err != nil {
		return nil, err
	}

	var detail seasonDetailResp
	if err := json.Unmarshal(data, &detail); err != nil {
		return nil, err
	}

	episodes := make([]SeasonEpisodeResult, 0, len(detail.Episodes))
	for _, e := range detail.Episodes {
		episodes = append(episodes, SeasonEpisodeResult{
			ID:            e.ID,
			Name:          e.Name,
			Overview:      e.Overview,
			AirDate:       e.AirDate,
			EpisodeNumber: e.EpisodeNumber,
			SeasonNumber:  e.SeasonNumber,
			Runtime:       e.Runtime,
			StillPath:     fixTMDBStillPath(e.StillPath),
		})
	}

	return &SeasonProfileResult{
		ID:           detail.ID,
		Name:         detail.Name,
		Number:       detail.SeasonNumber,
		AirDate:      detail.AirDate,
		Overview:     detail.Overview,
		SeasonNumber: detail.SeasonNumber,
		PosterPath:   fixTMDBImagePath(detail.PosterPath),
		Episodes:     episodes,
	}, nil
}

func (c *Client) FetchEpisodeProfile(tvID, seasonNumber, episodeNumber int) (*EpisodeProfileResult, error) {
	data, err := c.doRequest(fmt.Sprintf("/tv/%d/season/%d/episode/%d", tvID, seasonNumber, episodeNumber), nil)
	if err != nil {
		return nil, err
	}

	var ep episodeResp
	if err := json.Unmarshal(data, &ep); err != nil {
		return nil, err
	}

	return &EpisodeProfileResult{
		ID:            ep.ID,
		Name:          ep.Name,
		AirDate:       ep.AirDate,
		Overview:      ep.Overview,
		SeasonNumber:  ep.SeasonNumber,
		EpisodeNumber: ep.EpisodeNumber,
		Runtime:       ep.Runtime,
	}, nil
}

func (c *Client) FetchMovieProfile(id int) (*types.MovieProfile, error) {
	data, err := c.doRequest(fmt.Sprintf("/movie/%d", id), nil)
	if err != nil {
		return nil, err
	}

	var detail movieDetailResp
	if err := json.Unmarshal(data, &detail); err != nil {
		return nil, err
	}

	originCountry := make([]string, 0, len(detail.ProductionCountries))
	for _, c := range detail.ProductionCountries {
		originCountry = append(originCountry, c.ISO31661)
	}

	return &types.MovieProfile{
		ID:            strconv.Itoa(detail.ID),
		Name:          detail.Title,
		OriginalName:  derefStr(detail.OriginalTitle),
		Overview:      derefStr(detail.Overview),
		PosterPath:    fixTMDBImagePath(detail.PosterPath),
		BackdropPath:  fixTMDBBackdropPath(detail.BackdropPath),
		AirDate:       derefStr(detail.ReleaseDate),
		Status:        detail.Status,
		VoteAverage:   detail.VoteAverage,
		Popularity:    detail.Popularity,
		Genres:        detail.Genres,
		Runtime:       detail.Runtime,
		OriginCountry: originCountry,
		Type:          "movie",
		Source:        "tmdb",
	}, nil
}

func (c *Client) FetchPersonsOfSeason(tvID, seasonNumber int) ([]PersonProfileItem, error) {
	data, err := c.doRequest(fmt.Sprintf("/tv/%d/season/%d/credits", tvID, seasonNumber), nil)
	if err != nil {
		return nil, err
	}

	var credits creditsResp
	if err := json.Unmarshal(data, &credits); err != nil {
		return nil, err
	}

	return processPersons(credits), nil
}

func (c *Client) FetchPersonsOfMovie(movieID int) ([]PersonProfileItem, error) {
	data, err := c.doRequest(fmt.Sprintf("/movie/%d/credits", movieID), nil)
	if err != nil {
		return nil, err
	}

	var credits creditsResp
	if err := json.Unmarshal(data, &credits); err != nil {
		return nil, err
	}

	return processPersons(credits), nil
}

func processPersons(credits creditsResp) []PersonProfileItem {
	all := append(credits.Cast, credits.Crew...)
	result := make([]PersonProfileItem, 0, len(all))
	for _, p := range all {
		order := p.Order
		if order == 0 && p.KnownForDepartment != "Acting" {
			order = 9999
		}
		result = append(result, PersonProfileItem{
			ID:                 p.ID,
			Name:               p.Name,
			Gender:             p.Gender,
			ProfilePath:        fixTMDBProfilePath(p.ProfilePath),
			KnownForDepartment: p.KnownForDepartment,
			Order:              order,
		})
	}
	return result
}

func (c *Client) FetchPersonProfile(personID int) (*PersonProfileResult, error) {
	data, err := c.doRequest(fmt.Sprintf("/person/%d", personID), nil)
	if err != nil {
		return nil, err
	}

	var detail personDetailResp
	if err := json.Unmarshal(data, &detail); err != nil {
		return nil, err
	}

	name := detail.Name
	if isChinese(detail.PlaceOfBirth) {
		for _, n := range detail.AlsoKnownAs {
			if isChineseName(n) {
				name = n
				break
			}
		}
	}

	return &PersonProfileResult{
		ID:                 detail.ID,
		Name:               name,
		Biography:          detail.Biography,
		ProfilePath:        fixTMDBProfilePath(detail.ProfilePath),
		PlaceOfBirth:       detail.PlaceOfBirth,
		Birthday:           detail.Birthday,
		KnownForDepartment: detail.KnownForDepartment,
	}, nil
}

func isChinese(place string) bool {
	if place == "" {
		return false
	}
	keywords := []string{"China", "中国", "Hong Kong", "Taiwan"}
	for _, kw := range keywords {
		if len(place) >= len(kw) {
			for i := 0; i <= len(place)-len(kw); i++ {
				if place[i:i+len(kw)] == kw {
					return true
				}
			}
		}
	}
	return false
}

func isChineseName(name string) bool {
	for _, r := range name {
		if r < 0x4E00 || r > 0x9FA5 {
			return false
		}
	}
	return true
}
