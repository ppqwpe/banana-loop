# 축 프리셋 — 스키마와 만드는 법

## 왜 축으로 쪼개는가

한 컷을 N개로 펼칠 때 흔한 실패는 **모드 하나에 다양성을 몰아넣는 것**이다. 모드를 고르면 카메라·조명·연출이 통째로 따라오는 구조면, 컷 1의 A모드와 컷 20의 A모드가 시간대·색감·구도까지 동일해진다. 개별 이미지는 멀쩡한데 전체를 훑으면 "다 비슷하다"가 된다.

빌더는 먼저 컷·모드별로 어긋나게 배치한 조합을 선택한다. 중복이면 유한한 looks × compo × finish × moment 공간을 탐색한다. 카메라·시간·그레이딩·구도·순간·마감의 실제 문자열 조합으로 중복을 검사한다. 가능한 조합이 소진되면 저장하지 않고 실패한다.

이는 프롬프트 조합의 고유성 검사이며 생성 결과의 차이를 보장하지 않는다. 모드가 반복되는 변형은 A1, A2처럼 라벨을 구분한다.

## 스키마

```jsonc
{
 "name": "industrial",
 "title": "산업·시설 — 물류센터·공장·창고·사옥",

 "kinds": ["ext_air","ext_gnd","ext_det","int","obj","det"],
 "default_kind": "int",
 "kind_rules": { "ext_air": ["항공","드론","aerial","drone"], ... },

 "finish":   [7개 문자열],          // 촬영 질감 — 전역 축
 "no_text":  "간판을 빈 면으로 렌더하라는 지시",
 "negative": "text, lettering, ... 로 시작하는 쉼표 목록",
 "ignore":   [레퍼에서 무시할 속성 8~10개],
 "materials": {"treatment": "...", "condition": "..."},
 "focus":    "deep focus front to back, no tilt-shift, ...",

 "still":  {"B": "...", "J": "..."},   // life=="none" 인 모드마다 하나
 "moment": {"<kind>": {"calm":[4개], "busy":[4개]}},

 "modes": [
  {"letter":"A", "kor":"시네마틱", "name":"restrained cinematic",
   "life":"calm",                      // calm | busy | none
   "direction":"이 모드가 무엇을 위한 것인지 두 문장",
   "licence":"무엇을 더하거나 바꿔도 되는지",
   "light":"빛의 성격 한 줄",
   "cam":   {"<kind>":"위치·높이·프레이밍·화각감"},   // kinds 전부
   "looks": [["시간·날씨","그레이딩"], x3],
   "compo": ["화면 구조", x3]}
 ]
}
```

`kinds` 개수와 이름은 분야마다 다르다. `cam`·`moment` 는 `kinds` 를 **빠짐없이** 덮어야 한다 — `build_prompts.py` 의 `check_preset()` 이 빌드 전에 잡는다.

## 딸려 오는 프리셋

| 이름 | 분야 | 모드 | 컷 종류 |
|---|---|---|---|
| `industrial` | 물류센터·공장·창고·사옥 | 10 | `ext_air` `ext_gnd` `ext_det` `int` `obj` `det` |
| `product` | 패키지·기기·단품 | 8 | `hero` `group` `det` `situ` |
| `space` | 매장·오피스·주거·호텔 | 8 | `ext` `int` `vig` `det` |
| `people` | 작업자·팀·사용 장면 | 8 | `por` `work` `team` `hand` |

`--variants` 가 모드 수보다 크면 모드를 여러 바퀴 돈다. 2바퀴째는 `p=1` 이 되어 look·구도·마감·순간이 전부 다른 자리를 잡는다.

## 새 분야를 추가할 때

`industrial.json` 을 복사해서 고치는 게 빠르다. 지킬 것만 적는다.

**모드는 형용사가 아니라 촬영 방식이어야 한다.** "웅장하게"는 모드가 아니다. "카메라를 바닥에 놓고 통로를 올려다본다, 18mm"가 모드다. 두 모드를 같은 문장으로 설명할 수 있으면 하나로 합쳐야 한다.

**`cam` 은 위치와 높이를 명시하고 화각감으로 끝낸다.** 화각을 18mm~200mm로 넓게 벌린다. 이게 "왜 다 측면이냐"를 막는 유일한 장치다.

**`looks` 는 그 모드의 `light` 와 충돌하면 안 된다.** "하드 단일광"인 모드에 "부드러운 흐린 하늘"을 넣으면 모델이 둘 중 하나를 버린다.

**`compo` 는 그 모드의 `cam` 과 충돌하면 안 된다.** 부감 모드에 "수직선이 수렴한다"를 넣지 않는다.

**`moment` 는 조명이 아니라 벌어지는 일이다.** "따뜻한 빛이 든다"는 조명 축의 몫이다. "지게차 한 대가 뒤로 지나간다"가 순간이다.

**`life`가 `none`인 모드를 최소 하나 둔다.** 전부 북적이면 전체가 시끄러워진다. 비어 있고 조용한 컷이 편집에서 숨 쉬는 자리를 만든다.

**글자 금지는 건드리지 않는다.** `negative` 는 반드시 이 접두로 시작한다.

```
text, lettering, letters, words, typography, Korean hangul, numbers,
signage text, logo, wordmark, brand name, captions, subtitles,
watermark, garbled writing,
```

## 만든 뒤 확인

```bash
python3 -c "
import sys; sys.path.insert(0,'scripts')
from build_prompts import load_preset, check_preset
ps = load_preset('scripts/axes/새프리셋.json'); check_preset(ps)
print('모드', len(ps['modes']), '· 종류', ps['kinds'])"
```

그다음 실제로 한 번 빌드해서 `고유조합 N / N ✓` 를 확인한다. 축 개수가 적으면 여기서 중복이 난다. `looks` 나 `compo` 를 3개 미만으로 줄이면 거의 확실히 걸린다.
