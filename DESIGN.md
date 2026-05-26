# GitHub リポジトリ検索 Web アプリ 設計書

## 0. 概要と設計方針

GitHub の `search/repositories` API を用いて、リポジトリを検索・一覧表示し、詳細ページで Stars / Watchers / Forks / Issues などを確認できる Web アプリ。Next.js (v16+, App Router) で実装する。

本設計が重視する原則は次の 4 つ。

- **API 境界の隠蔽**: 薄いラッパで GitHub API を隠蔽し、UI からはドメイン型のみを扱う(外部 API の仕様変更を境界で吸収する)。
- **状態の分離**: サーバー状態(検索結果・詳細)、URL 由来のクライアント状態(検索クエリ・フィルタ・ページ)、ローカル UI 状態を明確に分ける。
- **一方向の拡張経路**: 新しいフィルタやカラムは「型 → URL → fetcher → UI」の一方向で追記できる構造にする。
- **4 状態の明示分岐**: loading / error / empty / success を全画面で必ず分岐させ、共通コンポーネントに集約する。

---

## 1. ディレクトリ構成

```
src/
├─ app/                          # App Router(画面とルーティングのみ)
│  ├─ layout.tsx
│  ├─ page.tsx                   # 検索画面(/)
│  ├─ repositories/
│  │  └─ [owner]/[name]/page.tsx # 詳細画面
│  ├─ loading.tsx                # ルートのフォールバック
│  ├─ error.tsx                  # ルートのエラーバウンダリ
│  └─ not-found.tsx
│
├─ features/                     # 画面単位のユースケース
│  ├─ repo-search/
│  │  ├─ components/             # SearchBar, RepoList, RepoListItem, Pagination, SortSelect, LanguageFilter
│  │  ├─ hooks/                  # useRepoSearchQuery (URL ↔ state), useRepoSearch (TanStack Query)
│  │  └─ index.ts
│  └─ repo-detail/
│     ├─ components/             # RepoHeader, RepoStats, OwnerBadge
│     └─ hooks/                  # useRepoDetail
│
├─ lib/
│  ├─ github/                    # GitHub API クライアント層(画面非依存)
│  │  ├─ client.ts               # fetch ラッパ(認証ヘッダ・タイムアウト・レート制限ハンドリング)
│  │  ├─ search-repositories.ts  # search エンドポイントの fetcher
│  │  ├─ get-repository.ts       # 詳細 fetcher
│  │  ├─ schema.ts               # zod スキーマ(GitHub のレスポンス検証)
│  │  └─ mappers.ts              # GitHub レスポンス → ドメイン型 変換
│  ├─ errors.ts                  # AppError / RateLimitError / NotFoundError
│  └─ query-client.ts            # TanStack Query の QueryClient
│
├─ types/
│  └─ repository.ts              # ドメイン型 Repository / RepositorySummary
│
├─ ui/                           # 汎用 UI(shadcn/ui を配置)
│  ├─ button.tsx, input.tsx, ...
│  └─ states/                    # <Loading/>, <ErrorState/>, <EmptyState/>
│
└─ test/
   ├─ msw/                       # MSW のハンドラ(GitHub API モック)
   └─ utils.tsx                  # render ラッパ(QueryClient 注入)
```

### 構成判断: feature-based を採用する

検索画面 / 詳細画面の 2 画面構成においても、フラット構成(`components/` / `hooks/` 横並び)ではなく feature-based(縦割り)を採用する。

**採用理由**:

1. **拡張時の影響範囲が局所化される**。「ユーザー検索」「Issue 検索」など同型の機能を追加する場合、`features/issue-search/` を並列に作るだけで完結する。横割りだと機能横断の責務が `components/` や `hooks/` に混ざり、追加・削除のたびに横断検索が必要になる。
2. **関心の分離が物理構造で担保される**。`features/repo-search/` と `features/repo-detail/` の間で直接 import しないルールにより、機能間の結合を構造的に防げる。共有が必要になった時点で初めて `lib/` か `ui/` に昇格させる。
3. **責務の所在が明確**。あるバグや変更要求に対して、どの feature を見ればよいかが命名から即座にわかる。

**運用ルール**:

- **共有判断は YAGNI**: 2 つ以上の feature で実際に使われるまで、コンポーネント・hook を `ui/` や `lib/` に昇格させない。
- **feature 間の直接 import を禁止**: `features/A` から `features/B` の中身を import しない。共有が必要なら `lib/` か `ui/` に上げる。ESLint の `no-restricted-imports` で機械的に強制する。
- **`features/*/index.ts` を公開境界とする**: feature の外からは `index.ts` で export されたものだけ参照可能。

**トレードオフ**:

- 2 画面規模ではフラット構成に比べてディレクトリが深くなる。
- 共有コンポーネントの置き場(`features/` 配下か `ui/` か)で判断が必要になるが、上記ルールで一元化する。

---

### 配置方針の理由

- **`app/` は薄く保つ**:ルーティングと SSR 境界(`generateMetadata` 等)だけにし、ロジックは `features/` と `lib/` に逃がす。これにより App Router の API(Server Component / Route Handler)が変わってもビジネスロジックを動かさずに済む。
- **`features/` は「画面単位」**:Repo Search と Repo Detail を独立フォルダにし、コンポーネント・hook・型を縦割りで持つ。横断する型は `types/`、横断するロジックは `lib/` に上げる。
- **`lib/github/` で GitHub API を完全に隠蔽**:UI からは「ドメイン型 `Repository`」のみを参照させる。GitHub のスキーマ変更や別ソースへの差し替えに耐える境界。
- **`ui/states/` を独立化**:Loading / Error / Empty の 3 状態を全画面で共通化し、UX のばらつきを防ぐ。

---

## 2. コンポーネント設計

### 2.1 検索画面 (`/`)

| コンポーネント                           | 責務                                                        | 主な Props                                              |
| ---------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------- |
| `RepoSearchPage` (page.tsx)              | 画面状態の取りまとめ。URL → state → fetch → state-branching | なし(URL から hook 経由で読む)                          |
| `SearchBar`                              | キーワード入力 + debounce。送信時に URL を更新するだけ。    | `defaultValue: string`, `onSubmit: (q: string) => void` |
| `FilterPanel`                            | language / sort / order の選択。値は URL に反映。           | `value: SearchParams`, `onChange: (next) => void`       |
| `RepoList`                               | 結果配列の繰り返し描画のみ。状態分岐は持たない。            | `items: RepositorySummary[]`                            |
| `RepoListItem`                           | 1 件のカード。`Link` で詳細へ。                             | `repo: RepositorySummary`                               |
| `Pagination`                             | ページ送り(GitHub は最大 1000 件)                           | `page`, `totalCount`, `perPage`, `onChange`             |
| `<Loading/> <ErrorState/> <EmptyState/>` | 共通の状態表示                                              | `message?`, `onRetry?`                                  |

### 2.2 詳細画面 (`/repositories/[owner]/[name]`)

| コンポーネント   | 責務                                                    | Props              |
| ---------------- | ------------------------------------------------------- | ------------------ |
| `RepoDetailPage` | fetch・状態分岐                                         | URL params         |
| `RepoHeader`     | name / description / owner avatar / language バッジ     | `repo: Repository` |
| `RepoStats`      | stars / watchers / forks / issues を 4 枚のカードで表示 | `repo: Repository` |
| `OwnerBadge`     | アバター + ログイン名 + プロフィールリンク              | `owner: Owner`     |

### 2.3 責務の分離方針

- **「状態を持つ」のは page と hook だけ**。`RepoList` などの提示用コンポーネントは props のみで動く純粋関数的に保つ(テスト容易性 + Storybook 化が可能)。
- **fetch は hook に閉じ込める**(`useRepoSearch`, `useRepoDetail`)。コンポーネントは TanStack Query の `data / status / error` を受け取って分岐するだけ。
- **URL ↔ state の同期は `useRepoSearchQuery` 一箇所**に集約。これにより「検索条件はリロードで失われない」「シェア可能」「戻る/進むで履歴を辿れる」を満たす。

---

## 3. 状態管理

| 種別                       | 何を                                    | どこで管理                                       | 理由                                                                                                    |
| -------------------------- | --------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| サーバー状態               | 検索結果 / 詳細                         | **TanStack Query**                               | キャッシュ、再取得、ローディング/エラー状態管理を自前で書かない。queryKey で URL パラメータと整合させる |
| URL 由来のクライアント状態 | キーワード, language, sort, order, page | **Next.js `useSearchParams` + `router.replace`** | リロード耐性・共有可能性・戻る進む対応。Zustand 等の余分な store は不要                                 |
| 純粋なローカル UI 状態     | input の編集中値、Popover の開閉        | **`useState`**                                   | スコープが狭く永続不要                                                                                  |

**queryKey 設計**:

```ts
["repos", "search", { q, language, sort, order, page, perPage }][
  ("repos", "detail", { owner, name })
];
```

URL の検索パラメータをそのまま key に使うことで、URL を真実の源とし、戻る/進むで自動的に別キャッシュが当たる構造にする。

---

## 4. API 設計

### 4.1 ドメイン型(UI が依存する唯一の型)

```ts
// types/repository.ts
export type RepositorySummary = {
  id: number;
  owner: { login: string; avatarUrl: string };
  name: string;
  fullName: string; // "owner/name"
  description: string | null;
  language: string | null;
  stargazersCount: number;
  updatedAt: string; // ISO
};

export type Repository = RepositorySummary & {
  watchersCount: number;
  forksCount: number;
  openIssuesCount: number;
  htmlUrl: string;
  topics: string[];
};
```

### 4.2 エンドポイント

| ユースケース | GitHub API                                                                                                               | 備考                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| 検索         | `GET https://api.github.com/search/repositories?q={q}+language:{lang}&sort={sort}&order={order}&page={page}&per_page=30` | 結果件数は最大 1000 件 / 認証なし: 10 req/min, トークン付き: 30 req/min                      |
| 詳細         | `GET https://api.github.com/repos/{owner}/{name}`                                                                        | `subscribers_count` を Watchers として扱う(GitHub の `watchers_count` は stars と同値のため) |

### 4.3 リクエスト・レスポンス型

- リクエスト型: `SearchParams = { q: string; language?: string; sort?: 'stars'|'forks'|'updated'; order?: 'asc'|'desc'; page: number; perPage: number }`
- レスポンス検証: zod スキーマで `lib/github/schema.ts` に定義 → `mappers.ts` でドメイン型へ変換。**UI に GitHub 生レスポンスを到達させない**。

### 4.4 キャッシュ戦略

- **TanStack Query**: `staleTime: 60_000`(検索), `staleTime: 5 * 60_000`(詳細)。一覧 → 詳細の遷移時、サマリ情報を `setQueryData` で詳細キャッシュにシード可能(初期描画の見た目を改善)。
- **Next.js fetch キャッシュ**: Server Component 経由で初期取得する場合は `fetch(url, { next: { revalidate: 60 } })` を採用。クライアント遷移はクエリキャッシュで吸収。
- **GitHub の ETag**: `If-None-Match` でレート制限消費を抑える(余裕があれば)。

### 4.5 エラーハンドリング

`lib/errors.ts` で分類:

| エラー               | HTTP                             | UI 挙動                                                                                          |
| -------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------ |
| `ValidationError`    | クライアント側で `q` が空        | フォームで弾く                                                                                   |
| `RateLimitError`     | 403 + `X-RateLimit-Remaining: 0` | 「アクセス上限に達しました。`{reset}` 後に再試行できます」を表示、ボタンを `reset` まで disabled |
| `NotFoundError`      | 404                              | 詳細ページで `notFound()` を呼び 404 画面へ                                                      |
| `NetworkError` / 5xx | –                                | `<ErrorState onRetry>` で再試行                                                                  |
| `UnknownError`       | –                                | 同上 + Sentry 等送信(本番想定)                                                                   |

`client.ts` で fetch ラッパが `Response` を見て上記の型付きエラーに変換し、Query の `error` に乗せる。UI は `instanceof` で分岐する。

---

## 5. ユーザーインタラクション

### 5.1 検索

- 入力は **`SearchBar` 内で 300ms デバウンス**しつつ、確定(Enter or 検索ボタン)で初めて URL を更新する。
- URL 更新 → `useSearchParams` → queryKey が変わる → 自動 refetch。
- 空文字での検索は弾く(GitHub API が 422 を返すため)。

### 5.2 フィルタ

- `language`:候補は一覧結果から動的に集計しつつ、トップに「全て」を置く。`q` に `language:xxx` を **混ぜずに別パラメータで保持** → URL を見ただけで状態がわかる。
- フィルタ変更時は `page` を 1 にリセット(古いページが空ヒットになるのを防ぐ)。

### 5.3 ソート

- `sort` ∈ `stars | forks | updated | (best-match=未指定)`、`order` ∈ `asc | desc`。
- 既定は best-match(GitHub のデフォルト)。Stars 降順への切替を 1 クリックで提供。

### 5.4 ページネーション

- `per_page=30`、`page` を URL に保持。
- `total_count` を使って総ページ数を出すが、**GitHub の制約で最大 1000 件 / 約 34 ページ** に頭打ちすることを明示。
- prev / next と現在ページ表示。jump 入力は MVP では持たない(拡張ポイント)。

---

## 6. 画面状態(loading / error / empty / success)

すべての fetch を行う画面で **明示的に 4 状態を分岐**する。

```tsx
if (status === "pending") return <Loading />;
if (status === "error") return <ErrorState error={error} onRetry={refetch} />;
if (data.items.length === 0) return <EmptyState query={q} />;
return <RepoList items={data.items} />;
```

- **Loading**: 一覧はスケルトン(カード形状を維持)、詳細はヘッダ + 4 枚のスタッツのスケルトン。CLS を起こさない。
- **Error**: 種別ごとに文言を出し分け(レート制限はリトライ時刻、ネットワークはリトライボタン、不明は問い合わせ導線)。
- **Empty**:
  - 初期表示(`q` 未入力):「キーワードを入力してください」のオンボーディングを出す(エラー扱いにしない)。
  - ヒット 0 件:「`{q}` に一致するリポジトリはありません」+ フィルタクリア導線。
- **Success**: 結果表示。レート制限残量が少ない場合は控えめに警告を表示。

---

## 7. テスト戦略

- **単体**(Vitest):
  - `lib/github/mappers.ts` — GitHub レスポンス → ドメイン型変換の境界。
  - `lib/github/client.ts` — ステータス別エラー変換。
- **コンポーネント**(Testing Library + MSW):
  - `SearchBar` — debounce / 空文字弾き。
  - `RepoSearchPage` — loading / error / empty / success の 4 状態を MSW で再現。
  - `RepoDetailPage` — 404 の `notFound` 呼び出し。
- **E2E**(任意、Playwright):検索 → 一覧 → 詳細遷移の Happy Path。

---

## 8. 設計判断の言語化(なぜこの設計か)

| 判断                                         | 採用理由                                                                                     | 不採用案と理由                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| App Router + Client Component 中心           | 検索 UI はインタラクション重視で TanStack Query の方が状態管理が素直                         | 全 Server Component:URL → 再 SSR の往復が増え、debounce との相性が悪い       |
| TanStack Query                               | キャッシュ・状態分岐・refetch を標準化                                                       | SWR でもよいが、`setQueryData` 等の API がリッチで詳細遷移の最適化がしやすい |
| URL を真実の源                               | リロード/共有/履歴に強く、評価観点の UX 配慮に直結                                           | Zustand 等の store:URL と二重管理になり破綻しやすい                          |
| zod でレスポンス検証                         | GitHub の仕様変更を fetch 層で検知でき、UI まで型崩れが波及しない                            | 検証なし:本番想定としては弱い                                                |
| `features/` 縦割り                           | 「リポジトリ検索」と「リポジトリ詳細」の関心を分離、機能追加(例: ユーザー検索)が縦に増やせる | `components/` の横割り:画面横断の責務が混じり拡張で破綻                      |
| Loading/Error/Empty を `ui/states/` で共通化 | 文言・スケルトンの一貫性、UX のばらつき防止                                                  | 各画面で都度書く:評価軸「エッジケース配慮」を満たしにくい                    |

---

## 9. 拡張性の担保

- **新フィルタ追加**(例: `topic`)の手順 = 4 ステップで完了する:
  1. `SearchParams` 型に `topic?: string` を足す
  2. `search-repositories.ts` の URL 組み立てに `q += ' topic:' + topic`
  3. `useRepoSearchQuery` の URL ↔ state マッピングに 1 行追加
  4. `FilterPanel` に UI を 1 つ追加
- **新カラム追加**(例: `license`)の手順:
  1. `RepositorySummary` 型に追加
  2. `mappers.ts` で詰める
  3. `RepoListItem` に表示を 1 行追加
- **別データソース(例: GitLab)**:`lib/github/` と並列に `lib/gitlab/` を作り、`mappers.ts` で同じ `Repository` 型に詰めれば UI は変更不要。

---

## 10. やらないこと(スコープ外)

- 認証(個人トークン)。ただし `NEXT_PUBLIC_GITHUB_TOKEN` を読めるようにし、レート制限緩和の差し込み口だけ用意。
- 無限スクロール / お気に入り / 検索履歴(拡張ポイントとして README に記載)。
- ダークモード切替(shadcn/ui の標準に任せる)。

---

## 11. プロダクション想定の実装観点

本アプリを本番運用する前提で、信頼性・性能・安全性・運用性に関わる設計上の決定を整理する。各項目は「なぜ必要か」と「実装での落とし所」をセットで記述する。

### 11.1 信頼性

- **zod でレスポンス検証**: GitHub の仕様変更を fetch 層で検知。UI に不正データを到達させない。
- **型付きエラー** (`lib/errors.ts`): `RateLimitError` / `NotFoundError` / `NetworkError` / `ValidationError` / `UnknownError`。`instanceof` で UI 分岐。
- **Error Boundary**: `app/error.tsx`(ルート毎)と `app/global-error.tsx`(最終防衛線)を配置。`digest` を表示し、調査可能にする。
- **Retry 戦略**: TanStack Query の `retry` は **5xx と Network のみ、最大 2 回、指数バックオフ**。4xx はリトライしない(レート制限はリセット時刻に従う)。

### 11.2 パフォーマンス

- TanStack Query の `staleTime` を 一覧 60s / 詳細 5min に設定。
- 一覧 → 詳細遷移時に `setQueryData` でサマリをシードし、初期描画の体感を改善。
- `next/image` で owner アバターを最適化(`sizes`, `priority` 未指定でデフォルト遅延)。
- features 単位でコード分割。`Pagination` 等は dynamic import するほどではないので静的同梱。
- Lighthouse / Web Vitals は手元で計測し、リグレッションがないかをリリース前に確認する。

### 11.3 セキュリティ

- **GitHub トークンはサーバー側のみ**: `process.env.GITHUB_TOKEN`(`NEXT_PUBLIC_` プレフィックスを使わない)。
- **Route Handler 経由でプロキシ**: `app/api/github/[...path]/route.ts` で GitHub API を中継し、トークンはサーバーから付与。クライアントには露出させない。
- **CSP / セキュリティヘッダ**: `next.config.ts` の `headers()` で `Content-Security-Policy`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, `Permissions-Policy` を設定。
- `dangerouslySetInnerHTML` を一切使用しない。README に明記。

### 11.4 アクセシビリティ (a11y)

- ランドマーク要素 (`<header>`, `<main>`, `<nav>`) を明示。
- フォーム要素は `<label>` を必ず関連付け。
- フォーカスリングを残す(shadcn/ui の既定を上書きしない)。
- **`aria-live="polite"`** をローディング/エラー領域に付与し、SR 利用者に状態変化を通知。
- キーボードのみで「検索 → 結果選択 → 詳細遷移 → 戻る」が可能なことを Playwright で 1 ケース担保。
- `eslint-plugin-jsx-a11y` を有効化。

### 11.5 国際化・表記の堅牢化

- 日付: `Intl.DateTimeFormat`(`updatedAt` の表示)。
- 数値: `Intl.NumberFormat`(stars が 100k+ になるケースで `1.2万` / `120k` のような短縮表示も用意)。
- 表示文言は `features/*/messages.ts` に定数化。将来 i18n (`next-intl` 等) に乗せ替えやすくする。

### 11.6 観測性 (Observability)

- 構造化ログ: サーバー側は JSON 形式で出力(`pino` 等への差し替えを前提に、ロガーは 1 箇所に集約してインタフェースを固定)。
- クライアント側エラーは Error Boundary を経由して `reportError(error)` に集約。Sentry 等への送信はアダプタ層で差し替え可能にする。
- Web Vitals: `app/layout.tsx` で `reportWebVitals` を設置し、計測値を観測基盤へ送信できる経路を用意する。

### 11.7 品質ゲート

- TypeScript `strict: true` + `noUncheckedIndexedAccess: true`。
- ESLint: `next/core-web-vitals`, `@typescript-eslint/recommended`, `jsx-a11y/recommended`。
- Prettier + `lint-staged` + `husky`(pre-commit で lint/format)。
- Vitest + Testing Library + MSW(コンポーネント/単体)、Playwright(Happy Path 1 本)。
- **GitHub Actions**: `pnpm install` → `lint` → `typecheck` → `test` → `build` を PR で実行。バッジを README に貼る。

### 11.8 DX / 運用

- パッケージマネージャを **pnpm** に固定 (`packageManager` フィールド)、`engines.node` を指定する。
- `.env.example` を必ず配置し、必要な環境変数を網羅する。
- `pnpm scripts`: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e`, `format`。

### 11.9 デプロイ前提

- Vercel デプロイを想定し、Route Handler のキャッシュ挙動 (`revalidate`) を明示する。
- 自前ホスト時は Next.js の `output: 'standalone'` を採用可能とし、ビルド成果物に Node モジュールを同梱できる構成にしておく。

---

## 12. 想定したリスクと前提

- GitHub の `search/repositories` は **未認証で 10 req/min** と厳しい。デモ時はトークン投入を想定し、レート制限 UI を本気で作り込む。
- `watchers_count` は実態と異なるため、詳細では `/repos/{owner}/{name}` の `subscribers_count` を使う。
- ページネーションは 1000 件で打ち切られるため、UI で明示する。
