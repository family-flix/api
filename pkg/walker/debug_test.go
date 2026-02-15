package walker

import (
	"testing"
)

func TestFormatEpisodeNumberDebug(t *testing.T) {
	cases := []struct {
		input string
		want  string
	}{
		{"第32集", "E32"},
		{"E32", "E32"},
		{"32", "E32"},
		{"第9集", "E09"},
		{"EP40", "E40"},
	}

	for _, c := range cases {
		got := formatEpisodeNumber(c.input)
		AssertEqual(t, got, c.want)
	}
}
