A [Bitfocus Companion](https://bitfocus.io/companion) module that controls PPTPresent over OSC: the slide show,
slides, presentations, video clips, scrolling text, the speaker timer, the outputs and which screen each output is on. It has feedbacks,
variables for every value PPTPresent reports, and presets. User help is in [companion/HELP.md](companion/HELP.md).

## PPTPresent's OSC protocol

PPTPresent listens for OSC over UDP (port 8000 by default) and sends feedback to port 9000 of every computer that
sends it commands, or to one computer named in its settings. Every address starts with `/pptpresent`.

| Command                                                                  | Does                                                                                   |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `/show/start`, `/show/stop`, `/show/toggle`                              | Start or stop the slide show                                                           |
| `/slide/next`, `/slide/prev`                                             | Next / previous build or slide                                                         |
| `/slide/goto <n>`                                                        | Go to slide n                                                                          |
| `/presentation/up`, `/presentation/down`                                 | Cue the presentation above / below in the list                                         |
| `/presentation/cue <n>`                                                  | Cue presentation n in the list                                                         |
| `/presentation/take`                                                     | Switch to the cued presentation                                                        |
| `/timer/start`, `/timer/stop`, `/timer/toggle`, `/timer/reset`           | Speaker timer                                                                          |
| `/timer/add <seconds>`                                                   | Add time; negative takes time away                                                     |
| `/output/program <1\|0>`, `/output/speaker <1\|0>`, `/output/ndi <1\|0>` | Output on or off                                                                       |
| `/output/program/toggle` (also `speaker`, `ndi`)                         | Switch an output                                                                       |
| `/output/program/screen <screen>`, `/output/speaker/screen <screen>`     | Show it on a screen: its number in the list, its display id, `main`, `window` or `off` |
| `/video/play`, `/video/pause`, `/video/toggle`, `/video/restart`         | Video clip: play (starts the show if needed), pause, both, back to the start           |
| `/scroll/play`, `/scroll/pause`, `/scroll/toggle`, `/scroll/restart`     | Scrolling text on the slide on screen: carry on, pause, both, start again              |
| `/scroll/faster`, `/scroll/slower`, `/scroll/normal`                     | Scrolling text 10 % faster / slower, or at the designed speed                          |
| `/scroll/speed <percent>`                                                | Scrolling text speed in percent of the designed speed (20–300)                         |
| `/feedback`                                                              | Send all feedback values now                                                           |

Feedback is sent when a value changes: `/show/running`, `/slide/index`, `/slide/count`, `/slide/text`,
`/presentation/name`, `/presentation/number`, `/presentation/total`, `/presentation/cued`,
`/presentation/cued/number`, `/timer/text`, `/timer/running`, `/timer/state` (normal / warn / over),
`/timer/limit`, `/clock`, `/video/loaded`, `/video/playing`, `/video/time`, `/video/remaining` ("-2:10"),
`/scroll/active`, `/scroll/paused`, `/scroll/speed` (percent),
`/output/program`, `/output/speaker`, `/output/ndi`, `/displays/count`, `/displays`
(screen names, one value each), `/displays/ids` (their display ids as text), and for `program` and `speaker`:
`/output/<output>/screen` (number in the list, 0 in a window or off), `/output/<output>/screen/name` and
`/output/<output>/screen/id`.

Keep this module in step with PPTPresent when its OSC addresses change.

## License

MIT
