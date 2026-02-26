package walker

import (
	"fmt"
	"reflect"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/google/go-cmp/cmp/cmpopts"
	"github.com/stretchr/testify/assert"
)

func AssertEqual[T any](t *testing.T, got, want T, msg ...string) {
	var ignoreFields []string
	wantVal := reflect.ValueOf(want)
	wantType := wantVal.Type()
	var opts []cmp.Option
	if wantType.Kind() == reflect.Struct {
		for i := 0; i < wantType.NumField(); i++ {
			field := wantType.Field(i)
			fieldVal := wantVal.Field(i)
			if reflect.DeepEqual(fieldVal.Interface(), reflect.Zero(fieldVal.Type()).Interface()) {
				ignoreFields = append(ignoreFields, field.Name)
			}
		}
		if len(ignoreFields) > 0 {
			opts = append(opts, cmpopts.IgnoreFields(want, ignoreFields...))
		}
	}
	diff := cmp.Diff(want, got, opts...)
	if diff != "" {
		assert.Fail(t, fmt.Sprintf("not equal\n%s", diff))
	}
}
