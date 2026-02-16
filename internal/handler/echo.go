package handler

import (
	"io"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

// EchoContext wraps echo.Context to implement the Context interface.
type EchoContext struct {
	ec echo.Context
	db *gorm.DB
}

func NewEchoContext(ec echo.Context, db *gorm.DB) *EchoContext {
	return &EchoContext{ec: ec, db: db}
}

func (c *EchoContext) Param(name string) string          { return c.ec.Param(name) }
func (c *EchoContext) QueryParam(name string) string     { return c.ec.QueryParam(name) }
func (c *EchoContext) Header(name string) string         { return c.ec.Request().Header.Get(name) }
func (c *EchoContext) Bind(v interface{}) error           { return c.ec.Bind(v) }
func (c *EchoContext) Body() io.ReadCloser               { return c.ec.Request().Body }
func (c *EchoContext) JSON(code int, v interface{}) error { return c.ec.JSON(code, v) }
func (c *EchoContext) DB() *gorm.DB                      { return c.db }

// WrapEcho converts a HandlerFunc into an echo.HandlerFunc.
func WrapEcho(db *gorm.DB, h HandlerFunc) echo.HandlerFunc {
	return func(ec echo.Context) error {
		return h(NewEchoContext(ec, db))
	}
}
