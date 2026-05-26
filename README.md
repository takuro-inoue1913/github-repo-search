# GitHub Repository Search

[![CI](https://github.com/takuro-inoue1913/github-repo-search/actions/workflows/ci.yml/badge.svg)](https://github.com/takuro-inoue1913/github-repo-search/actions/workflows/ci.yml)

GitHub のリポジトリを検索・閲覧できる Web アプリケーション。

本ドキュメントは利用ガイドと**設計書**を兼ねている。

---

## 目次

- [動かし方](#動かし方)
- [設計方針](#設計方針)
- [ディレクトリ構成](#ディレクトリ構成)
- [コンポーネント設計](#コンポーネント設計)
- [状態管理](#状態管理)
- [API 設計](#api-設計)
- [ユーザーインタラクション](#ユーザーインタラクション)
- [画面状態(読み込み中 / エラー / 該当なし / 成功)](#画面状態読み込み中--エラー--該当なし--成功)
- [テスト戦略](#テスト戦略)
- [プロダクション想定の実装観点](#プロダクション想定の実装観点)
- [拡張のしやすさ](#拡張のしやすさ)
- [主要な技術選定の理由](#主要な技術選定の理由)
- [スコープ判断](#スコープ判断)
- [把握しているリスクと前提](#把握しているリスクと前提)
- [AI 利用レポート](#ai-利用レポート)
- [今後の拡張ポイント](#今後の拡張ポイント)

---

## 動かし方

### 必要環境

- Node.js `>=20.11`(動作確認は v22.12)
- pnpm `>=9`

### セットアップ

```bash
pnpm install
cp .env.example .env.local
# .env.local に GITHUB_TOKEN を設定(下記参照)
pnpm dev
```

`http://localhost:3000` で起動する。

### GITHUB_TOKEN の取得

1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens**
2. `Public Repositories (read-only)` のみを許可
3. 発行されたトークンを `.env.local` の `GITHUB_TOKEN` に設定

未設定でも動作するが、未認証は **10 req/min** のレート制限にすぐ達する。トークン付きでは 30 req/min まで緩和される。**トークンはサーバー側でのみ使用し、クライアントには露出させない**(Route Handler 経由でプロキシ。詳細は [API 設計](#api-設計) 参照)。

### スクリプト

| コマンド            | 内容                         |
| ------------------- | ---------------------------- |
| `pnpm dev`          | 開発サーバー起動             |
| `pnpm build`        | 本番ビルド                   |
| `pnpm start`        | 本番起動                     |
| `pnpm lint`         | ESLint                       |
| `pnpm typecheck`    | TypeScript 型チェック        |
| `pnpm test`         | Vitest(単体・コンポーネント) |
| `pnpm test:e2e`     | Playwright(E2E)              |
| `pnpm format`       | Prettier で自動整形          |
| `pnpm format:check` | Prettier の整形チェック      |

---

## 設計方針

設計の柱は次の 4 つ。

- **GitHub API を 1 箇所に閉じ込める**: 画面側からは「リポジトリ」というアプリ独自の型だけを扱い、GitHub のレスポンス形式を直接見せない。GitHub 側で項目が変わっても、変更点を吸収するのは API ラッパ層だけで済む。
- **状態は 3 つに分ける**: ① 検索結果などサーバーから取ってくるもの、② URL に乗せる検索条件、③ 画面内だけで完結する一時的な値、を混ぜずに別々に扱う。
- **機能追加は同じ手順で済む形にする**: 新しいフィルタやカラムは「型 → URL → API 呼び出し → 画面」の順に 1 行ずつ足すだけで追加できるよう、流れを一方向に揃える。
- **画面の 4 状態を必ず分岐する**: 読み込み中・エラー・該当なし・表示成功 を全画面で同じ書き方で扱い、共通コンポーネントにまとめる。

---

## ディレクトリ構成

```
src/
├─ app/                              # App Router(ルーティングと SSR 境界のみ薄く)
│  ├─ layout.tsx                     # QueryProvider をマウント
│  ├─ page.tsx                       # 検索画面 (/)
│  ├─ error.tsx                      # ルート Error Boundary
│  ├─ api/github/
│  │  ├─ search/route.ts             # 検索プロキシ
│  │  └─ repos/[owner]/[name]/route.ts  # 詳細プロキシ
│  └─ repositories/[owner]/[name]/
│     ├─ page.tsx                    # 詳細画面
│     └─ not-found.tsx
│
├─ features/                         # 画面単位の縦割り (feature-based)
│  ├─ repo-search/
│  │  ├─ components/                 # SearchBar / FilterPanel / RepoList / RepoListItem / Pagination
│  │  ├─ hooks/
│  │  │  ├─ use-repo-search-query.ts # URL ↔ state の同期
│  │  │  └─ use-repo-search.ts       # TanStack Query
│  │  ├─ repo-search-page.tsx
│  │  └─ index.ts                    # 公開境界
│  └─ repo-detail/
│     ├─ components/                 # RepoHeader / RepoStats / OwnerBadge / BackToSearchButton
│     ├─ hooks/use-repo-detail.ts
│     ├─ repo-detail-page.tsx
│     └─ index.ts
│
├─ lib/
│  ├─ github/                        # GitHub API クライアント層(画面非依存)
│  │  ├─ client.ts                   # fetch ラッパ + ステータス → 型付きエラー変換
│  │  ├─ schema.ts                   # zod スキーマ(一次情報のリンクをコメントに明記)
│  │  ├─ mappers.ts                  # GitHub レスポンス → ドメイン型
│  │  ├─ search-repositories.ts      # 検索 fetcher (サーバー側)
│  │  ├─ get-repository.ts           # 詳細 fetcher (サーバー側)
│  │  └─ index.ts
│  ├─ api-client.ts                  # ブラウザから /api/github/* を叩く薄いクライアント
│  ├─ query-client.tsx               # TanStack Query の QueryClientProvider
│  ├─ errors.ts                      # ValidationError / NotFoundError / RateLimitError / NetworkError / UnknownApiError
│  └─ format.ts                      # Intl.NumberFormat / Intl.RelativeTimeFormat
│
├─ types/repository.ts               # ドメイン型 Repository / RepositorySummary / SearchParams 等
└─ ui/states/                        # <Loading/> <SkeletonList/> <ErrorState/> <EmptyState/>
```

### 構成判断: 機能ごとにフォルダを分ける(feature-based)

画面が検索 / 詳細の 2 つしかない今回でも、`components/` や `hooks/` を画面横断でフラットに並べる構成ではなく、**機能ごとに 1 フォルダ**(`features/repo-search/`, `features/repo-detail/`)に分ける構成を選んだ。

**理由**:

1. **追加・削除のときに触る範囲が狭くて済む**。新しい画面(例: ユーザー検索)を作るときも `features/user-search/` を 1 つ足すだけで終わる。フラット構成だと「どのコンポーネント・どのフックが何の画面用か」がフォルダ名から読めなくなり、改修のたびに全体を見る羽目になる。
2. **画面同士の絡まりを構造で防げる**。`features/repo-search/` から `features/repo-detail/` の中身を直接 `import` しないルールにすることで、画面間の依存をうっかり生やせない。共有したくなったら、その時点で `lib/` か `ui/` に引き上げる。
3. **どこを見ればいいかが一目でわかる**。「検索画面のバグ」と聞けば `features/repo-search/` だけ開けば足りる。

**運用ルール**:

- **共通化は実際に必要になってからやる**: 2 つ以上の機能で使われるようになるまで、コンポーネントやフックを `ui/` や `lib/` に引き上げない。
- **機能同士で直接 `import` しない**: 共有したくなったら、その時点で `lib/` か `ui/` に上げる。
- **機能フォルダの外からは `index.ts` 経由でだけ参照する**: 何を公開しているかを `index.ts` に書く運用にして、内部のファイル構成を自由に変えられるようにする。

### フォルダ配置の意図

- **`app/` は薄く保つ**: 画面のルーティングと、GitHub への中継 API (Route Handler) だけを置く。実際のロジックは `features/` と `lib/` に逃がす。こうすることで、Next.js の流儀が変わったときに影響を受けるのを最小限にできる。
- **`lib/github/` で GitHub API を 1 箇所に閉じる**: 画面側はアプリ独自の型 (`Repository`) しか触らない。GitHub の項目名が変わっても、修正箇所は `lib/github/` の中だけで済む。
- **`ui/states/` を独立化**: 読み込み中・エラー・該当なし の表示を全画面で共通化し、文言や見た目のブレを防ぐ。

---

## コンポーネント設計

### 検索画面 (`/`)

| コンポーネント                           | 責務                                                      | 主な Props                                         |
| ---------------------------------------- | --------------------------------------------------------- | -------------------------------------------------- |
| `RepoSearchPage`                         | URL → state → fetch → 状態分岐の取りまとめ                | なし(URL から hook 経由で読む)                     |
| `SearchBar`                              | キーワード入力。`key` で `defaultValue` 変更時にリセット  | `defaultValue`, `onSubmit`                         |
| `FilterPanel`                            | language / sort / order / perPage の選択。値は URL に反映 | `language`, `sort`, `order`, `perPage`, `onChange` |
| `RepoList`                               | 結果配列の繰り返し描画のみ。状態分岐は持たない            | `items: RepositorySummary[]`                       |
| `RepoListItem`                           | 1 件のカード。`Link` で詳細へ                             | `repo: RepositorySummary`                          |
| `Pagination`                             | ページ送り(GitHub の 1000 件キャップを UI で明示)         | `page`, `perPage`, `totalCount`, `onChange`        |
| `<Loading/> <ErrorState/> <EmptyState/>` | 共通の状態表示                                            | `error?`, `onRetry?` 等                            |

### 詳細画面 (`/repositories/[owner]/[name]`)

| コンポーネント       | 責務                                                     | Props              |
| -------------------- | -------------------------------------------------------- | ------------------ |
| `RepoDetailPage`     | fetch・状態分岐                                          | URL params         |
| `BackToSearchButton` | 履歴があれば `router.back()`、無ければ `/` への Link     | `onBack`           |
| `RepoHeader`         | name / description / owner / language / topics / license | `repo: Repository` |
| `RepoStats`          | stars / watchers / forks / open issues の 4 枚カード     | `repo: Repository` |
| `OwnerBadge`         | アバター + ログイン名 + プロフィールリンク               | `owner: Owner`     |

### コンポーネントの役割分担

- **状態を持つのはページとフックだけ**。`RepoList` のような表示用コンポーネントは props で受け取った値を並べるだけにする。表示だけに専念させると、テストもしやすく、見た目の差し替えも楽になる。
- **データ取得はフックの中に閉じ込める**(`useRepoSearch`, `useRepoDetail`)。コンポーネント側は「成功 / 失敗 / 読み込み中」のどれかを受け取って表示を出し分けるだけ。
- **URL と検索条件の同期は `useRepoSearchQuery` 1 箇所にまとめる**。これによって「リロードしても検索条件が消えない」「URL をそのまま誰かに送れる」「ブラウザの戻る/進むでちゃんと前の検索結果に戻れる」が成立する。

---

## 状態管理

状態を 3 種類に分けて扱う。どこに何を置くかを混ぜないことで、片方を変更しても他に影響しないようにしている。

| 状態の種類                   | 例                                                  | 置き場所                                            | なぜそこに置くか                                                                                                    |
| ---------------------------- | --------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| サーバーから取ってくるデータ | 検索結果 / 詳細                                     | **TanStack Query**                                  | キャッシュや再取得、読み込み中・失敗の判定をライブラリに任せられる。URL が変われば自動で別キャッシュに切り替わる    |
| URL に持たせる検索条件       | `q`, `language`, `sort`, `order`, `page`, `perPage` | **Next.js の `useSearchParams` + `router.replace`** | リロードしても消えない・URL を共有できる・ブラウザの戻る/進むがそのまま使える。Zustand 等の状態管理ライブラリは不要 |
| 画面の中で完結する一時的な値 | 入力途中のキーワード                                | **`useState`**                                      | 他に共有する必要がなく、画面を閉じれば消えてよい                                                                    |

**TanStack Query のキー設計**(検索結果を区別するための識別子):

```ts
["repos", "search", { q, language, sort, order, page, perPage }];
["repos", "detail", { owner, name }];
```

検索条件をそのままキーに含めることで、URL が変わるたびに自動的に別の検索結果として扱われる。URL に出さなくてもよい値(例: `perPage` のデフォルトの 10)は URL から省略して、見た目を綺麗に保っている。

---

## API 設計

### ドメイン型(UI が依存する唯一の型)

```ts
// src/types/repository.ts
export type RepositorySummary = {
  id: number;
  owner: Owner;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stargazersCount: number;
  updatedAt: string;
  htmlUrl: string;
};

export type Repository = RepositorySummary & {
  watchersCount: number;
  forksCount: number;
  openIssuesCount: number;
  topics: string[];
  defaultBranch: string;
  license: string | null;
};
```

### エンドポイント

| ユースケース | クライアント → アプリ                               | アプリ → GitHub                                                                           |
| ------------ | --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 検索         | `GET /api/github/search?q=...&page=...&perPage=...` | `GET https://api.github.com/search/repositories?...`                                      |
| 詳細         | `GET /api/github/repos/{owner}/{name}`              | `GET https://api.github.com/repos/{owner}/{name}`(Watchers は `subscribers_count` を採用) |

ブラウザから `api.github.com` を直接呼ばず、いったん Next.js サーバー側の API (`/api/github/*`) を経由して GitHub にアクセスする。**目的は GitHub のトークンをブラウザに渡さないため**。トークンは `process.env.GITHUB_TOKEN` としてサーバー側でのみ読まれ、`Authorization` ヘッダはサーバー → GitHub の通信にしか付かない。`NEXT_PUBLIC_` 付きの環境変数はバンドルに含まれてしまうので使わない。

### レスポンスの検証

GitHub からの生レスポンスは `lib/github/schema.ts` で zod を使って検証し、`mappers.ts` でアプリ独自の型に変換する。**画面側は GitHub の生レスポンスを直接触らない**。スキーマは GitHub の REST API (バージョン `2022-11-28`) の `search/repositories` と `repos` のドキュメントを参照しつつ、このアプリで使う項目だけを抜粋している(ファイル先頭のコメントに公式ドキュメントへのリンクを書いてある)。

### キャッシュ戦略

- **TanStack Query**: 一覧は 60 秒、詳細は 5 分間「新鮮」とみなす。ページ送り中は前回の結果を表示したままにし、検索条件が変わったときだけスケルトンに切り替える。
- **Next.js の fetch キャッシュ**: サーバー側の API 中継部分で `revalidate` を指定し、検索 60 秒 / 詳細 300 秒の単位で再取得する。

### エラーの扱い

GitHub からの失敗レスポンスは、HTTP ステータスごとに**アプリ固有のエラー型**に変換してから画面に渡す。画面側は型で分岐するだけで、HTTP ステータスを直接見る必要はない。

| エラー型          | 発生条件                          | 画面の挙動                                           | リトライ               |
| ----------------- | --------------------------------- | ---------------------------------------------------- | ---------------------- |
| `ValidationError` | 空クエリなどで 400                | フォームで弾く / `<ErrorState>` で「入力エラー」表示 | しない                 |
| `NotFoundError`   | 404                               | 詳細画面で 404 ページに切り替える                    | しない                 |
| `RateLimitError`  | レート制限超過 (403 + 残り回数 0) | 解除時刻を表示し、再試行ボタンを無効化               | しない                 |
| `NetworkError`    | 通信失敗                          | 再試行ボタン付きのエラー表示                         | 2 回まで(時間を空けて) |
| `UnknownApiError` | 5xx などその他のサーバー異常      | 再試行ボタン付きのエラー表示                         | 1 回                   |

エラー型への変換は **2 段階**で行う。

1. `lib/github/client.ts`(サーバー側): GitHub のレスポンスを見て上記のいずれかに変換。
2. `lib/api-client.ts`(ブラウザ側): サーバーから返された JSON を見て、再度同じエラー型に復元。

これで画面側はサーバー/クライアントの違いを気にせず、`instanceof RateLimitError` のような形で分岐できる。

---

## ユーザーインタラクション

### 検索

- キーワードは入力中はローカルに溜めておき、**Enter または検索ボタン押下で初めて URL を更新する**。1 文字打つたびに API を呼ぶ実装にはしない(GitHub のレート制限を踏まえ、1 検索 = 1 リクエストに絞る)。
- 空文字は弾く。
- URL が更新されると、検索結果のキーが変わって自動的に再取得される。

### フィルタ

- **言語**: TypeScript / JavaScript / Python / Go / Rust / Ruby / Java / C++ の固定リストから選択。検索キーワード `q` の中に `language:xxx` のように混ぜず、URL の `language` パラメータとして独立させている。こうすることで URL を見ただけで「いま何で絞り込んでいるか」がわかる。
- フィルタを変えたときは **ページ番号を 1 に戻す**。例えば 5 ページ目を見ている状態で言語を切り替えると、新しい絞り込みでは 5 ページ目が存在しない可能性があるため。

### ソート

- 並び順は `stars / forks / updated / best-match`、方向は `asc / desc`。
- 既定値は `best-match`(GitHub の標準)。このとき方向セレクトは無効化する(方向の概念がないため)。

### ページネーション・表示件数

- 1 ページの件数は 10 / 30 / 50 / 100 から選択(デフォルトは 10)。URL に `perPage` として乗るが、デフォルトのときは URL から省略。
- ページ番号も URL に保持する。
- **GitHub の検索 API は最大 1000 件までしか返らない**ため、UI でその上限を明示する(例: 「1000 件まで表示」)。
- 前へ / 次へ と「N 件中 X - Y 件目」を表示。

### 詳細画面から戻ったとき

- 戻る導線は、ブラウザ履歴があればブラウザの「戻る」と同じ挙動 (`router.back()`) を、履歴がなければトップへのリンクを表示する。
- これにより、**検索結果一覧から詳細を開いた場合は、戻ったときに検索条件・ページ番号がそのまま復元される**。URL を真実の源にしているからこそ成立する挙動。

---

## 画面状態(読み込み中 / エラー / 該当なし / 成功)

データを取得する画面では、必ず **4 つの状態を順番に分岐**する。同じ書き方で揃えることで、状態の見落としを防ぐ。

```tsx
if (query.isError) return <ErrorState error={query.error} onRetry={refetch} />;
if (query.isPending || query.isPlaceholderData) return <SkeletonList ... />;
if (data.items.length === 0) return <EmptyState ... />;
return <RepoList items={data.items} />;
```

- **読み込み中**: 一覧は実際のカードと同じ形のスケルトンを出す。表示位置が後からズレないので、レイアウトのガタつきが起きない。
- **エラー**: エラーの種類に応じて文言とボタンを出し分ける。レート制限は解除時刻を表示してボタンを無効化、通信失敗や 5xx は再試行ボタンを出す、入力エラー・404 は再試行不可。
- **該当なし**: ヒット 0 件のとき「`{キーワード}` に一致するリポジトリはありません」を表示。
- **成功**: 結果一覧を表示。

スクリーンリーダー向けに、読み込み中の領域には `aria-live="polite"`、エラーには `aria-live="assertive"` を指定し、状態の変化を読み上げで通知できるようにしている。

---

## テスト戦略

- **単体(Vitest)**
  - `lib/github/mappers.ts`: snake_case → camelCase 変換、`watchers_count = stars` の罠を `subscribers_count` で回避していること、`license` の spdx_id 優先
  - `lib/github/search-repositories.ts`: URL 構築・`ValidationError`・`best-match` の特別扱い
  - `lib/api-client.ts`: 400/404/429/502 を型付きエラーに変換(MSW で再現)
- **コンポーネント(Vitest + Testing Library + MSW)**
  - `SearchBar`: 空文字弾き / trim
  - `RepoSearchPage`: idle / loading / error / empty / success の状態分岐(MSW でレスポンスを差し替え)
- **E2E(Playwright)**
  - `e2e/search.spec.ts`: 検索 → 結果一覧 → 詳細遷移 → Stats 表示の Happy Path、およびキーボードのみで完走できる a11y ケース
  - 外部 API は叩かず、Playwright の `page.route()` で `/api/github/*` をモックしてレート制限・障害から E2E を切り離す

CI(GitHub Actions)で `format:check / lint / typecheck / unit-test / build / e2e` を並列ジョブで実行。Playwright のブラウザは `pnpm-lock.yaml` ハッシュキーでキャッシュし、失敗時は HTML レポートをアーティファクト保存する。

---

## プロダクション想定の実装観点

本アプリを本番運用する前提で、信頼性・性能・安全性・運用性に関わる設計上の決定を整理する。

### 信頼性

- **GitHub のレスポンスを zod で検証**: GitHub 側で項目の型が変わったら API ラッパ層でエラーになり、画面まで壊れたデータが届かない。ただし新しい項目が追加されただけで壊れないよう、未知のフィールドは無視する設定にしている。
- **エラーを型で分類** (`lib/errors.ts`): レート制限・404・通信失敗・入力エラーなどをアプリ独自のエラー型に変換し、画面側は型で分岐するだけにする。
- **Error Boundary**: 想定外のエラーが起きても画面が真っ白にならないよう、`app/error.tsx` で捕捉して再試行ボタンを出す。エラー ID (`digest`) も表示して調査の手がかりにする。
- **再試行は限定的に行う**: サーバー側の一時的な失敗(5xx)や通信エラーは自動で再試行するが、レート制限や 404 のような「再試行しても直らない」エラーは試さない。

### パフォーマンス

- 検索結果は 60 秒、詳細は 5 分間キャッシュとして使い、不要な再取得を抑える。
- 検索条件が変わったときは「前回の結果を見せたまま」ではなく**スケルトンに切り替える**。何が表示されているのかが曖昧になるのを防ぐ。
- アバター画像は `next/image` で遅延ロード(外部画像なので最適化処理はオフ)。
- 機能フォルダ単位で自然にコード分割される構造になっている。

### セキュリティ

- **GitHub のトークンはサーバー側にしか存在しない**: ブラウザに渡らないよう、ブラウザは Next.js の中継 API を呼び、その中継 API がサーバー側でトークンを付けて GitHub に問い合わせる。
- `dangerouslySetInnerHTML` は使わない(XSS のリスクを避ける)。

### アクセシビリティ

- `<header>` `<main>` `<nav>` のような意味付きのタグを使い、スクリーンリーダーで構造が読み取れるようにする。
- フォーム部品にはラベルを必ず関連付け、検索領域には `role="search"` を付与。
- フォーカスリングを残してキーボード操作の現在位置がわかるようにする。
- 読み込み中・エラーの領域には `aria-live` を付け、状態変化が読み上げられるようにする。
- 「検索 → 結果選択 → 詳細遷移 → 戻る」までを**マウスを使わず完走できる**ことを Playwright で自動テストしている。

### 国際化・表記の堅牢化

- 日付: `dayjs` + `relativeTime` プラグイン + `ja` locale で「3 日前」、30 日以上前は `YYYY/MM/DD` の絶対日付に切り替える。
- 数値: `Intl.NumberFormat` で `1,234`、1,000 以上は `compact` 表記で `1.2万` 等に。

**日付ライブラリの選定**:

- **dayjs を採用**: 軽量(~7KB)、API がシンプル、`relativeTime` プラグインで「N 日前」を一行で書ける。`locale` も import 一行で切り替え可能。
- **`Intl.RelativeTimeFormat` 直接利用は不採用**: 動くが、閾値分岐(秒・分・時間・日)を自前で書く必要があり、後から保守する人にとって意図が読み取りにくい。
- **`date-fns` は不採用**: 関数型 API でツリーシェイクは強いが、locale import や `formatDistance` のオプション設計が dayjs より冗長。今回の規模では dayjs の素直さを取った。

**数値フォーマットに `Intl.NumberFormat` を残した理由**: 数値の桁区切り・compact 表記は標準 API で十分かつ簡潔。dayjs の領域でもないので、わざわざ別ライブラリを足す必要はない。

### ログ・監視の差し込み口

- ブラウザ側のエラーは Error Boundary 1 箇所に集まる構造。Sentry 等を導入する際は、その 1 箇所に送信処理を足せばよい。
- サーバー側のログは Route Handler と `lib/github/client.ts` に集中していて、`pino` などのロガーへ差し替えるときも修正箇所が少ない。

### 品質を担保する仕組み

- **TypeScript の厳格な設定**: `strict: true` と `noUncheckedIndexedAccess: true`。配列アクセスの戻り値が `undefined` になりうるケースも型で表現される。
- **ESLint + Prettier**: CI で整形チェックも実行し、整形漏れがマージされるのを防ぐ。
- **テスト 3 層**: Vitest(ロジック・コンポーネント)/ MSW(API モック)/ Playwright(E2E)。
- **GitHub Actions**: PR ごとに整形チェック → Lint → 型チェック → 単体テスト → ビルド → E2E を実行。バッジは README 冒頭に貼っている。

### 開発者体験 / 運用

- パッケージマネージャは `pnpm` に固定(`packageManager` フィールドで明示)。
- `.env.example` を置いてある。`.env.local` 等は `.gitignore` 対象だが、`.env.example` だけは追跡対象から外していない。
- スクリプト: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:watch`, `test:e2e`, `format`, `format:check`。

---

## 拡張のしやすさ

機能追加が「型 → URL → API 呼び出し → 画面」の一方向で済むよう構造を揃えている。代表的な追加パターンの手順は以下。

- **新しいフィルタを追加する**(例: `topic` で絞り込み)
  1. `SearchParams` 型に `topic?: string` を足す
  2. API のリクエスト URL 組み立てに 1 行追加
  3. URL と state のマッピングに 1 行追加
  4. フィルタパネルに UI を 1 つ追加
- **一覧や詳細にカラムを追加する**(例: ライセンスを一覧にも表示)
  1. ドメイン型に項目を追加(必要なら zod スキーマにも)
  2. GitHub レスポンスを変換する mapper に 1 行追加
  3. 表示コンポーネントに 1 行追加
- **別のデータソースに対応する**(例: GitLab):`lib/github/` と並べて `lib/gitlab/` を作り、同じドメイン型に変換すれば、画面側の変更は不要。
- **新しい画面を追加する**(例: Issue 検索):`features/issue-search/` を新しく作るだけで、既存の機能には影響しない。

---

## 主要な技術選定の理由

「なぜこれを選んだか」を、採用しなかった案と並べて整理する。

| 採用したもの                                          | 採用した理由                                                            | 不採用にしたもの・理由                                                             |
| ----------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| App Router + Client Component 中心                    | 検索フォームのような入力が多い画面はクライアント側の方が素直に書ける    | 全部 Server Component: 入力のたびに再描画の往復が増え、操作感が悪化する            |
| TanStack Query                                        | キャッシュ・読み込み中・エラーの扱いを標準化できる                      | SWR: ほぼ同等だが、後からキャッシュ操作が必要になったときに API が手厚い方を選んだ |
| URL を「検索状態の正本」にする                        | リロード・URL 共有・ブラウザの戻る進む に強い                           | Zustand 等の状態ライブラリ: URL と二重管理になり、ズレが発生しやすい               |
| zod でレスポンスを検証                                | GitHub 側で型が変わったときに API ラッパ層で止まり、画面まで壊れない    | 検証なし: 本番運用を想定すると弱い                                                 |
| 中継 API (Route Handler) 経由で GitHub に問い合わせる | GitHub トークンをブラウザに出さずに済む                                 | ブラウザから直接 GitHub を叩く: トークンが必ずブラウザに漏れる                     |
| 機能単位でフォルダを分ける                            | 追加・削除のたびに触る範囲が狭くて済む                                  | フラットな `components/`: 画面が増えると責務がごちゃつく                           |
| 読み込み中・エラー・該当なし を共通化                 | 文言や見た目のブレを防げる                                              | 画面ごとに書く: エッジケースの抜けが出やすい                                       |
| Watchers に `subscribers_count` を使う                | GitHub の `watchers_count` は stars と同値で、実態の watcher 数ではない | `watchers_count` をそのまま使う: 数値が嘘になる                                    |

---

## スコープ判断

### やったこと

- 検索(キーワード)・フィルタ(language)・ソート(stars / forks / updated)・ページネーション(perPage 選択可)
- 詳細画面(stars / watchers / forks / open issues / topics / license / default branch)
- loading / error / empty / success の 4 状態を全画面で明示
- GitHub API のプロキシ化とトークン秘匿
- 戻る導線で検索クエリを維持
- 単体 / コンポーネント / E2E のテスト
- CI(format / lint / typecheck / unit-test / build / e2e)

### やらなかったこと(理由付き)

- **ユーザー認証 / OAuth**: 課題スコープ外。サーバー env でのトークン管理で十分。
- **無限スクロール**: ページネーションの方が「現在地」が明確で、URL シェアに強い。スクロール位置リセット問題も避けられる。
- **お気に入り / 検索履歴**: 永続化先(ローカルストレージ or DB)の選定が課題スコープを超える。
- **debounce 入力**: GitHub API のレート制限を踏まえ、確定送信(Enter / ボタン押下)で 1 リクエストに絞る方が安全。
- **i18n**: 文言は日本語固定。将来 `next-intl` 等への差し替えに備え、テキストは小さく散らさない方針で書いている。
- **ダークモード切替**: ライトテーマで統一(`prefers-color-scheme` の自動切替も無効化)。
- **CSP ヘッダの本格設定**: 課題スコープ外。Vercel デフォルト + `dangerouslySetInnerHTML` 不使用で本課題範囲のリスクは抑えている。

---

## 把握しているリスクと前提

- **GitHub のレート制限が厳しい**: 未認証だと 10 リクエスト / 分しか送れない。デモ時はトークンを入れる前提で、制限に達した場合は解除時刻を表示する UI を入れている。
- **GitHub の `watchers_count` は実態を表さない**: stars と同値になる仕様なので、詳細画面では `subscribers_count` を Watchers として表示している(`subscribers_count` が無いケースは `watchers_count` にフォールバック)。
- **検索結果は 1000 件で打ち切られる**: GitHub の検索 API の仕様。UI で明示している。
- **GitHub のレスポンスに新しい項目が増えても壊れない**: zod の検証で未知のフィールドは無視する設定にしている。一方、既存項目の型が変わったときは zod がエラーを出して Error Boundary でキャッチされ、画面までは届かない。

---

## AI 利用レポート

本課題では Anthropic Claude (Claude Code, Opus 4.7) を活用した。透明性のため利用方針を記録する。

### 使ったツール

- **Claude Code (Opus 4.7, 1M context)**: ターミナル統合の AI コーディングエージェント

### フェーズ分けでの活用

| フェーズ     | AI に任せたこと                                                | 人間が判断したこと                                                                   |
| ------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 要件理解     | 課題 URL の要約抽出                                            | 評価軸の重み付け                                                                     |
| 設計         | 設計書のドラフト生成、選択肢の比較表                           | アーキテクチャ判断(API 隠蔽、URL を真実の源、状態管理の三層分離、feature-based 採用) |
| 実装         | ボイラープレート、コンポーネント雛形、型定義、テストコード生成 | API 境界(`lib/github/`)の設計、エラー型の分類、レビュー判断                          |
| テスト       | テストケースのひな形                                           | 何を担保するかの選定、MSW ハンドラの境界設計                                         |
| CI           | GitHub Actions YAML の雛形                                     | ジョブ分割、キャッシュキー戦略の判断                                                 |
| ドキュメント | 設計書 / README のドラフト                                     | 採否の最終判断、メタ表現(評価軸への言及等)の除去                                     |

### プロンプトの工夫

- **設計 → 実装 → テスト → CI → ドキュメント** のフェーズを明示的に分け、設計が固まってから次に進めた。これにより手戻りを抑え、AI 出力をレビュー可能な粒度に保った。
- AI に「不採用案も挙げて理由を書け」と依頼することで、判断の言語化を強制し、コピペ採用を避けた。
- API レスポンス型は **公式ドキュメントを一次情報として確認**し、AI 出力をそのまま信用しなかった(GitHub の `watchers_count` のような罠を回避)。
- 設計書を「評価向けのアピール文書」ではなく「設計書として自立した文書」に書き換える指示で、メタ言及(「評価軸への応答」「過剰設計と取られないよう…」)を除去した。

### 採用しなかった AI 提案の例

- `watchers_count` を Watchers として使う初期案 → `subscribers_count` に変更。
- 状態管理に Zustand を勧める提案 → URL を真実の源とする方針と衝突するため不採用。
- 初期描画でオンボーディング文「キーワードを入力してください」を出す提案 → 入力欄が見えていれば自明であり冗長なため撤去。
- `useEffect` + `setState` で `window.history.length` を読む案 → `react-hooks/set-state-in-effect` ルールに引っかかり、`useSyncExternalStore` に書き換え。

### 効果と限界

- **効果**: 設計ドラフトの初速、選択肢の網羅、テストケースの抜け漏れ防止、CI YAML / Playwright の雛形作成。
- **限界**:
  - ライブラリ API のハルシネーション(例: zod v4 で deprecated になった `.string().url()`)。型エラーや ESLint で検知して都度修正。
  - 「動けば良い」レベルのコード生成に流れがち。対策として **設計書を先に固定**し、それに従わせた。
  - スコープ判断は AI に任せない(過剰実装を避けるため人間が決定)。

---

## 今後の拡張ポイント

- 認証付きアクセス(個人 OAuth)でレート制限をさらに緩和
- 無限スクロール / Virtualized list
- 検索履歴 / お気に入り(ローカルストレージ)
- ユーザー検索 / Issue 検索への横展開(`features/` 縦割りなので並列追加可能)
- i18n(`next-intl`)
- CSP / Permissions-Policy などのセキュリティヘッダ強化
- Web Vitals / Sentry の本格接続
