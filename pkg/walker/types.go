package walker

// SearchedEpisode represents a found episode
type SearchedEpisode struct {
	TV struct {
		Name         string
		OriginalName string
		FileID       string
		FileName     string
	}
	Season struct {
		SeasonText string
		FileID     string
		FileName   string
	}
	Episode struct {
		FileID       string
		FileName     string
		ParentPaths  string
		ParentIDs    string
		ParentFileID string
		SeasonText   string
		EpisodeText  string
		Year         string
		Size         int64
		MD5          string
	}
	Position string
}

// SearchedMovie represents a found movie
type SearchedMovie struct {
	FileID       string
	FileName     string
	Name         string
	OriginalName string
	Year         string
	ParentPaths  string
	ParentFileID string
	Size         int64
	MD5          string
	Position     string
}

// ParsedVideoInfo represents parsed info from filename
type ParsedVideoInfo struct {
	Name         string
	OriginalName string
	Season       string
	Episode      string
	Year         string
	Resolution   string
	Source       string
	Encode       string
	VoiceEncode  string
	EpisodeCount string
	EpisodeName  string
	Type         string
	VoiceType    string
	SubtitleLang string
	AirDate      string
	Extra1       string
	Extra2       string
	Extra3       string
}

type SearchedSubtitle struct {
	FileID string
	Name   string
}

type SearchedImg struct {
	FileID string
	Name   string
}

type SearchedNFO struct {
	FileID string
	Name   string
}

type SearchedWarning struct {
	FileID      string
	Name        string
	ParentPaths string
	Position    string
	Message     string
}
