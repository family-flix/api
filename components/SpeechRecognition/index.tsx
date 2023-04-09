import React, { useState, useEffect, useCallback, useRef } from "react";

const LongPressInput = () => {
  const [is_recording, set_is_recording] = useState(false);
  const long_press_ref = useRef(false);
  const timer_ref = useRef<NodeJS.Timeout | null>(null);

  const prepare_long_press = useCallback(() => {
    long_press_ref.current = true;
    timer_ref.current = setTimeout(() => {
      if (long_press_ref.current) {
        handle_long_press();
      }
    }, 800);
  }, []);
  const cancel_long_press = useCallback(() => {
    long_press_ref.current = false;
    if (timer_ref.current) {
      clearTimeout(timer_ref.current);
    }
    set_is_recording(false);
  }, []);

  const handle_long_press = useCallback(() => {
    set_is_recording(true);
  }, []);

  return (
    <div>
      <div
        className="w-36 h-36 bg-white select-none"
        // disabled={isRecording}
        onMouseDown={prepare_long_press}
        onMouseUp={cancel_long_press}
        onTouchStart={prepare_long_press}
        onTouchEnd={cancel_long_press}
      >
        {is_recording ? "Recording..." : "Press and Hold to Speak"}
      </div>
    </div>
  );
};

export default LongPressInput;
