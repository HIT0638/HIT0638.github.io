# xxx


Emoji 可以通过多种方式在 Hugo 项目中启用.

<!--more-->

[`emojify`](https://gohugo.io/functions/emojify/) 方法可以直接在模板中调用, 或者使用[行内 Shortcodes](https://gohugo.io/templates/shortcode-templates#inline-shortcodes).

要全局使用 emoji, 需要在你的[网站配置](https://gohugo.io/getting-started/configuration/)中设置 `enableEmoji` 为 `true`,
然后你就可以直接在文章中输入 emoji 的代码.

它们以**冒号**开头和结尾，并且包含 emoji 的 **代码**:

```markdown
去露营啦! {?:}tent: 很快就回来.

真开心! {?:}joy:
```

呈现的输出效果如下:

去露营啦! :tent: 很快就回来.

真开心! :joy:

以下**符号清单**是 emoji 代码的非常有用的参考.

## 表情与情感

### 笑脸表情

| 图标 | 代码 | 图标 | 代码 |
| :-: | - | :-: | - |
| :grinning: | `grinning` | :smiley: | `smiley` |
| :smile: | `smile` | :grin: | `grin` |
| :laughing: | `laughing` <br /> `satisfied` | :sweat_smile: | `sweat_smile` |
| :rofl: | `rofl` | :joy: | `joy` |
| :slightly_smiling_face: | `slightly_smiling_face` | :upside_down_face: | `upside_down_face` |
| :wink: | `wink` | :blush: | `blush` |
| :innocent: | `innocent` | | |

### 爱意表情

| 图标 | 代码 | 图标 | 代码 |
| :-: | - | :-: | - |
| :heart_eyes: | `heart_eyes` | :kissing_heart: | `kissing_heart` |
| :kissing: | `kissing` | :relaxed: | `relaxed` |
| :kissing_closed_eyes: | `kissing_closed_eyes` | :kissing_smiling_eyes: | `kissing_smiling_eyes` |

### 吐舌头表情

| 图标 | 代码 | 图标 | 代码 |
| :-: | - | :-: | - |
| :yum: | `yum` | :stuck_out_tongue: | `stuck_out_tongue` |
| :stuck_out_tongue_winking_eye: | `stuck_out_tongue_winking_eye` | :stuck_out_tongue_closed_eyes: | `stuck_out_tongue_closed_eyes` |
| :money_mouth_face: | `money_mouth_face` | | |

### 带手的表情

| 图标 | 代码 | 图标 | 代码 |
| :-: | - | :-: | - |
| :hugs: | `hugs` | :thinking: | `thinking` |

### 中性表情

| 图标 | 代码 | 图标 | 代码 |
| :-: | - | :-: | - |
| :zipper_mouth_face: | `zipper_mouth_face` | :neutral_face: | `neutral_face` |
| :expressionless: | `expressionless` | :no_mouth: | `no_mouth` |
| :smirk: | `smirk` | :unamused: | `unamused` |
| :roll_eyes: | `roll_eyes` | :grimacing: | `grimacing` |
| :lying_face: | `lying_face` | | |

### 困倦的表情

| 图标 | 代码 | 图标 | 代码 |
| :-: | - | :-: | - |
| :relieved: | `relieved` | :pensive: | `pensive` |
| :sleepy: | `sleepy` | :drooling_face: | `drooling_face` |
| :sleeping: | `sleeping` | | |

### 不适的表情

| 图标 | 代码 | 图标 | 代码 |
| :-: | - | :-: | - |
| :mask: | `mask` | :face_with_thermometer: | `face_with_thermometer` |
| :face_with_head_bandage: | `face_with_head_bandage` | :nauseated_face: | `nauseated_face` |
| :sneezing_face: | `sneezing_face` | :dizzy_face: | `dizzy_face` |

### 戴帽子的表情

| 图标 | 代码 | 图标 | 代码 |
| :-: | - | :-: | - |
| :cowboy_hat_face: | `cowboy_hat_face` | | |

### 戴眼镜的表情

| 图标 | 代码 | 图标 | 代码 |
| :-: | - | :-: | - |
| :sunglasses: | `sunglasses` | :nerd_face: | `nerd_face` |

### 担心的表情

| 图标 | 代码 | 图标 | 代码 |
| :-: | - | :-: | - |
| :confused: | `confused` | :worried: | `worried` |
| :slightly_frowning_face: | `slightly_frowning_face` | :frowning_face: | `frowning_face` |
| :open_mouth: | `open_mouth` | :hushed: | `hushed` |
| :astonished: | `astonished` | :flushed: | `flushed` |
| :frowning: | `frowning` | :anguished: | `anguished` |
| :fearful: | `fearful` | :cold_sweat: | `cold_sweat` |
| :disappointed_relieved: | `disappointed_relieved` | :cry: | `cry` |
| :sob: | `sob` | :scream: | `scream` |
| :confounded: | `confounded` | :persevere: | `persevere` |
| :disappointed: | `disappointed` | :sweat: | `sweat` |
| :weary: | `weary` | :tired_face: | `tired_face` |

### 否定的表情

| 图标 | 代码 | 图标 | 代码 |
| :-: | - | :-: | - |
| :triumph: | `triumph` | :pout: | `pout` <br /> `rage` |
| :angry: | `angry` | :smiling_imp: | `smiling_imp` |
| :imp: | `imp` | :skull: | `skull` |
| :skull_and_crossbones: | `skull_and_crossbones` | | |

### 特殊打扮的表情

| 图标 | 代码 | 图标 | 代码 |
| :-: | - | :-: | - |
| :hankey: | `hankey` <br /> `poop` <br /> `shit` | :clown_face: | `clown_face` |
| :japanese_ogre: | `japanese_ogre` | :japanese_goblin: | `japanese_goblin` |
| :ghost: | `ghost` | :alien: | `alien` |
| :space_invader: | `space_invader` | :robot: | `robot` |

### 猫脸表情

| 图标 | 代码 | 图标 | 代码 |
| :-: | - | :-: | - |
| :smiley_cat: | `smiley_cat` | :smile_cat: | `smile_cat` |
| :joy_cat: | `joy_cat` | :heart_eyes_cat: | `heart_eyes_cat` |
| :smirk_cat: | `smirk_cat` | :kissing_cat: | `kissing_cat` |
| :scream_cat: | `scream_cat` | :crying_cat_face: | `crying_cat_face` |
| :pouting_cat: | `pouting_cat` | | |

### 猴脸表情

| 图标 | 代码 | 图标 | 代码 |
| :-: | - | :-: | - |
| :see_no_evil: | `see_no_evil` | :hear_no_evil: | `hear_no_evil` |
| :speak_no_evil: | `speak_no_evil` | | |

### 情感

| 图标 | 代码 | 图标 | 代码 |
| :-: | - | :-: | - |
| :kiss: | `kiss` | :love_letter: | `love_letter` |
| :cupid: | `cupid` | :gift_heart: | `gift_heart` |
| :sparkling_heart: | `sparkling_heart` | :heartpulse: | `heartpulse` |
| :heartbeat: | `heartbeat` | :revolving_hearts: | `revolving_hearts` |
| :two_hearts: | `two_hearts` | :heart_decoration: | `heart_decoration` |
| :heavy_heart_exclamation: | `heavy_heart_exclamation` | :broken_heart: | `broken_heart` |
| :heart: | `heart` | :yellow_heart: | `yellow_heart` |
| :green_heart: | `green_heart` | :blue_heart: | `blue_heart` |
| :purple_heart: | `purple_heart` | :black_heart: | `black_heart` |
| :100: | `100` | :anger: | `anger` |
| :boom: | `boom` <br /> `collision` | :dizzy: | `dizzy` |
| :sweat_drops: | `sweat_drops` | :dash: | `dash` |
| :hole: | `hole` | :bomb: | `bomb` |
| :speech_balloon: | `speech_balloon` | :eye_speech_bubble: | `eye_speech_bubble` |
| :right_anger_bubble: | `right_anger_bubble` | :thought_balloon: | `thought_balloon` |
| :zzz: | `zzz` | | |

## 人与身体

### 张开手掌的手势

| 图标 | 代码 | 图标 | 代码 |
| :-: | - | :-: | - |
| :wave: | `wave` | :raised_back_of_hand: | `raised_back_of_hand` |
| :raised_hand_with_fingers_splayed: | `raised_hand_with_fingers_splayed` | :hand: | `hand` <br /> `raised_hand` |
| :vulcan_salute: | `vulcan_salute` | | |

### 部分手指的手势

| 图标 | 代码 | 图标 | 代码 |
| :-: | - | :-: | - |
| :ok_hand: | `ok_hand` | :v: | `v` |
| :crossed_fingers: | `crossed_fingers` | :metal: | `metal` |
| :call_me_hand: | `call_me_hand` | | |

### 一根手指的手势

| 图标 | 代码 | 图标 | 代码 |
| :-: | - | :-: | - |
| :point_left: | `point_left` | :point_right: | `point_right` |
| :point_up_2: | `point_up_2` | :fu: | `fu` <br /> `middle_finger` |
| :point_down: | `point_down` | :point_up: | `point_up` |

### 握紧的手势

| 图标 | 代码 | 图标 | 代码 |
| :-: | - | :-: | - |
| :+1: | `+1` <br /> `thumbsup` | :-1: | `-1` <br /> `thumbsdown` |
| :fist: | `fist` <br /> `fist_raised` | :facepunch: | `facepunch` <br /> `fist_oncoming` <br /> `punch` |
| :fist_left: | `fist_left` | :fist_right: | `fist_right` |

### 两只手

| 图标 | 代码 | 图标 | 代码 |
| :-: | - | :-: | - |
| :clap: | `clap` | :raised_hands: | `raised_hands` |
| :open_hands: | `open_hands` | :handshake: | `handshake` |
| :pray: | `pray` | | |

### 握住东西的手势

| 图标 | 代码 | 图标 | 代码 |
| :-: | - | :-: | - |
| :writing_hand: | `writing_hand` | :nail_care: | `nail_care` |
| :selfie: | `selfie` | | |

### 身体部位

| 图标 | 代码 | 图标 | 代码 |
| :-: | - | :-: | - |
| :muscle: | `muscle` | :ear: | `ear` |
| :nose: | `nose` | :eyes: | `eyes` |
| :eye: | `eye` | :tongue: | `tongue` |
| :lips: | `lips` | | |

### 人

| 图标 | 代码 | 图标 | 代码 |
| :-: | - | :-: | - |
| :baby: | `baby` | :boy: | `boy` |
| :girl: | `girl` | :blonde_man: | `blonde_man` <br /> `person_with_blond_hair` |
| :man: | `man` | :woman: | `woman` |
| :blonde_woman: | `blonde_woman` | :older_man: | `older_man` |
| :older_woman: | `older_woman` | | |

### 身体动作

| 图标 | 代码 | 图标 | 代码 |
| :-: | - | :-: | - |
| :frowning_woman: | `frowning_woman` <br /> `person_frowning` | :frowning_man: | `frowning_man` |
| :person_with_pouting_face: | `person_with_pouting_face` <br /> `pouting_woman` | :pouting_man: | `pouting_man` |
| :ng_woman: | `ng_woman` <br /> `no_good` <br /> `no_good_woman` | :ng_man: | `ng_man` <br /> `no_good_man` |
| :ok_woman: | `ok_woman` | :ok_man: | `ok_man` |
| :information_desk_person: | `information_desk_person` <br /> `sassy_woman` <br /> `tipping_hand_woman` | :sassy_man: | `sassy_man` <br /> `tipping_hand_man` |
| :raising_hand: | `raising_hand` <br /> `raising_hand_woman` | :raising_hand_man: | `raising_hand_man` |
| :bow: | `bow` <br /> `bowing_man` | :bowing_woman: | `bowing_woman` |
| :man_facepalming: | `man_facepalming` | :woman_facepalming: | `woman_facepalming` |
| :man_shrugging: | `man_shrugging` | :woman_shrugging: | `woman_shrugging` |

### 人物角色

| 图标 | 代码 | 图标 | 代码 |
| :-: | - | :-: | - |
| :man_health_worker: | `man_health_worker` | :woman_health_worker: | `woman_health_worker` |
| :man_student: | `man_student` | :woman_student: | `woman_student` |
| :man_teacher: | `man_teacher` | :woman_teacher: | `woman_teacher` |
| :man_judge: | `man_judge` | :woman_judge: | `woman_judge` |
| :man_farmer: | `man_farmer` | :woman_farmer: | `woman_farmer` |
| :man_cook: | `man_cook` | :woman_cook: | `woman_cook` |
| :man_mechanic: | `man_mechanic` | :woman_mechanic: | `woman_mechanic` |
| :man_factory_worker: | `man_factory_worker` | :woman_factory_worker: | `woman_factory_worker` |
| :man_office_worker: | `man_office_worker` | :woman_office_worker: | `woman_office_worker` |
| :man_scientist: | `man_scientist` | :woman_scientist: | `woman_scientist` |
| :man_technologist: | `man_technologist` | :woman_technologist: | `woman_technologist` |
| :man_singer: | `man_singer` | :woman_singer: | `woman_singer` |
| :man_artist: | `man_artist` | :woman_artist: | `woman_artist` |
| :man_pilot: | `man_pilot` | :woman_pilot: | `woman_pilot` |
| :man_astronaut: | `man_astronaut` | :woman_astronaut: | `woman_astronaut` |
| :man_firefighter: | `man_firefighter` | :woman_firefighter: | `woman_firefighter` |
| :cop: | `cop` <br /> `policeman` | :policewoman: | `policewoman` |
| :detective: | `detective` <br /> `male_detective` | :female_detective: | `female_detective` |
| :guardsman: | `guardsman` | :guardswoman: | `guardswoman` |
| :construction_worker: | `construction_worker` <br /> `construction_worker_man` | :construction_worker_woman: | `construction_worker_woman` |
| :prince: | `prince` | :princess: | `princess` |
| :man_with_turban: | `man_with_turban` | :woman_with_turban: | `woman_with_turban` |
| :man_with_gua_pi_mao: | `man_with_gua_pi_mao` | :man_in_tuxedo: | `man_in_tuxedo` |
| :bride_with_veil: | `bride_with_veil` | :pregnant_woman: | `pregnant_woman` |

### 幻想的人物

| 图标 | 代码 | 图标 | 代码 |
| :-: | - | :-: | - |
| :angel: | `angel` | :santa: | `santa` |
| :mrs_claus: | `mrs_claus` | | |

### 人物活动

| 图标 | 代码 | 图标 | 代码 |
| :-: | - | :-: | - |
| :massage: | `massage` <br /> `massage_woman` | :massage_man: | `massage_man` |
| :haircut: | `haircut` <br /> `haircut_woman` | :haircut_man: | `haircut_man` |
| :walking: | `walking` <br /> `walking_man` | :walking_woman: | `walking_woman` |
| :runner: | `runner` <br /> `running` <br /> `running_man` | :running_woman: | `running_woman` |
| :dancer: | `dancer` | :man_dancing: | `man_dancing` |
| :business_suit_levitating: | `business_suit_levitating` | :dancers: | `dancers` <br /> `dancing_women` |
| :dancing_men: | `dancing_men` | | |
