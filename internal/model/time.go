package model

import (
	"database/sql/driver"
	"fmt"
	"strings"
	"time"
)

type LocalTime struct {
	time.Time
}

func (LocalTime) GormDataType() string {
	return "time"
}

var timeFormats = []string{
	"2006-01-02 15:04:05.999999999-07:00",
	"2006-01-02T15:04:05.999999999-07:00",
	"2006-01-02 15:04:05.999999999",
	"2006-01-02T15:04:05.999999999",
	"2006-01-02 15:04:05",
	"2006-01-02T15:04:05",
	"2006-01-02 15:04",
	"2006-01-02T15:04",
	"2006-01-02",
}

func (t *LocalTime) Scan(value interface{}) error {
	if value == nil {
		t.Time = time.Time{}
		return nil
	}
	switch v := value.(type) {
	case time.Time:
		t.Time = v
		return nil
	case string:
		v = strings.TrimSuffix(v, "Z")
		for _, format := range timeFormats {
			if parsed, err := time.ParseInLocation(format, v, time.UTC); err == nil {
				t.Time = parsed
				return nil
			}
		}
		return fmt.Errorf("cannot parse time string: %s", v)
	default:
		return fmt.Errorf("unsupported type for LocalTime: %T", value)
	}
}

func (t LocalTime) Value() (driver.Value, error) {
	if t.Time.IsZero() {
		return nil, nil
	}
	return t.Time, nil
}
