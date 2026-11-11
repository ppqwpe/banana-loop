# 파일명과 슬롯 번호

- 파일: `01_이름.jpg`, `100_제품.webp`처럼 1~999의 번호와 이름. 확장자 jpg/jpeg/png/webp.
- 같은 번호 두 장은 오류. 스캐너와 폴더 로더 모두 덮어쓰지 않고 거부한다.
- `01`, `03`처럼 공백 번호는 허용. 없는 번호는 생성 목록에 포함하지 않는다.
- 폴더 연결은 선택한 폴더 바로 아래 파일만 읽는다. 하위 폴더는 읽지 않는다.
- `_prompts.json`과 사진을 같은 폴더에 둔다.

## 이름 정리

원본 보존 요청이 있으면 먼저 `정리된_레퍼`에 복사한 뒤, 아래 명령은 복사본 폴더에만 적용한다. `--apply`는 해당 폴더의 파일명을 실제 변경한다.

```sh
python scripts/scan_refs.py "폴더" --rename
python scripts/scan_refs.py "폴더" --rename --apply
```

`--rename`은 규칙 미준수 파일에 현재 최대 번호 다음 번호를 붙인다. 공백을 메우지 않는다. 전체를 1..N으로 다시 매기려면 `--renumber`를 사용한다. 기존 번호순, 그다음 미준수 파일의 이름순으로 정렬한다.

```sh
python scripts/scan_refs.py "폴더" --renumber
python scripts/scan_refs.py "폴더" --renumber --apply
```

변경안만 볼 때는 아무 파일도 쓰지 않는다. 적용할 때 대상 이름 충돌을 검사하고 임시 이름을 거쳐 바꾼다. 이름 변경이 끝나면 폴더를 다시 읽어 cuts.json을 작성하고 기존 entity·유효한 kind를 보존한다. 작업 도중 다른 프로그램이 파일을 바꾸지 않게 한다. 번호를 바꾼 뒤에는 `_prompts.json`도 다시 빌드한다.

## 슬롯

`slot = reference_id + variant_index * stride`

`stride = 최대 레퍼 번호를 10 단위로 올림`, 최소 10.

`reference_id = ((slot - 1) % stride) + 1`

레퍼가 1번과 3번뿐이면 stride=10, 슬롯은 1/11/...과 3/13/...이다. 2번 그룹은 생성되지 않는다. 공백 때문에 다른 레퍼로 밀리는 구조가 아니다.

결과 다운로드·파일명 연결은 자동화하지 않는다. 실행 기록의 slot/rep를 사이트 이력과 대조한다.
