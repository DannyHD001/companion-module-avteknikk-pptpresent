## PPTPresent

Controls PPTPresent, an app for presenting PowerPoint decks, designer slideshows and video clips with an NDI overlay to screens and NDI, over OSC: slide show, slides, presentations, video clips, the speaker timer and the outputs, with feedback. Needs PPTPresent 0.1.8 or later for choosing screens, and 0.1.17 or later for video clips.

### Setup

1. In PPTPresent open **App settings › Remote control (OSC)** and turn it on.
2. Leave its **feedback host** empty (feedback then goes to every computer that sends commands), or set it to the Companion computer.
3. In this connection set:
   - **PPTPresent computer**: its IP address, or `127.0.0.1` when it runs on this computer.
   - **Command port**: the port PPTPresent listens on (8000 by default).
   - **Feedback port**: the port PPTPresent sends feedback to (9000 by default).

The connection turns green once PPTPresent answers. PPTPresent only sends values that change, so the module asks for all of them when it starts and whenever it has been quiet for 10 seconds.

### Actions

- **Slide show: start / stop** (start, stop or toggle)
- **Slide: next**, **Slide: previous**, **Slide: go to**
- **Presentation: cue above / below**, **Presentation: cue number**, **Presentation: take cued**
- **Timer: start / stop / reset**, **Timer: add or take away time** (negative takes time away)
- **Video: play / pause / restart**: play (starts the show if it is not running), pause, play or pause, or back to the start of the loaded video clip
- **Output: on / off** for the program screen, speaker notes screen and NDI output
- **Output: show on screen**: put the program or the speaker notes on one of the PPTPresent computer's screens, in a window, or off. The screen list fills in from PPTPresent once connected and follows screens being plugged in or out; type a number to pick that screen of the list instead
- **Refresh feedback**

### Feedbacks

Connected, slide show running, slide show is on slide n, presentation n is loaded, a presentation (or presentation n) is cued, timer running, timer state (normal, warn, over), video clip loaded, video is playing, video time left below n seconds, output is on, output is on screen.

### Variables

| Variable                                                                          | Value                                                                                       |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `connected`                                                                       | true while PPTPresent answers                                                               |
| `show_running`                                                                    | true while the slide show runs                                                              |
| `slide_index`, `slide_count`, `slide_text`                                        | current slide, number of slides, "3 / 12"                                                   |
| `presentation_name`, `presentation_number`, `presentation_total`                  | loaded presentation, its place in the list, list length                                     |
| `presentation_cued`, `presentation_cued_number`                                   | cued presentation and its place (empty / 0 if none)                                         |
| `timer_text`, `timer_running`, `timer_state`, `timer_limit`                       | "12:34" (or "+01:05" when over), running, normal / warn / over, speaker time                |
| `clock`                                                                           | time of day on the PPTPresent computer                                                      |
| `video_loaded`, `video_playing`                                                   | true when the loaded presentation is a video clip, and while it plays                       |
| `video_time`, `video_remaining`                                                   | where the clip is ("1:05") and the time left ("-2:10")                                      |
| `output_program`, `output_speaker`, `output_ndi`                                  | true when that output is on                                                                 |
| `output_program_screen`, `output_program_screen_name`, `output_program_screen_id` | number in the list (0 in a window or off), name, display id of the screen the program is on |
| `output_speaker_screen`, `output_speaker_screen_name`, `output_speaker_screen_id` | the same for the speaker notes                                                              |
| `displays_count`                                                                  | number of screens on the PPTPresent computer                                                |

### Presets

Ready-made buttons for the show, slides, presentations (cue 1–10, take), video clips (play/pause with the time, play, pause, back to the start, time left that turns red in the last 10 seconds), the timer (display that turns yellow and red, start/stop, reset, ±10/30/60 s), the outputs, a button per screen for the program and the speaker notes (green where it is shown), the clock and the connection status.

### Several connections on one port

The feedback port is shared through Companion, so a Generic OSC connection or a second PPTPresent connection can listen on the same port. Each PPTPresent connection only takes feedback from its own computer when that is given as an IP address.
