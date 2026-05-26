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
- [画面状態(loading / error / empty / success)](#画面状態loading--error--empty--success)
- [テスト戦略](#テスト戦略)
- [プロダクション想定の実装観点](#プロダクション想定の実装観点)
- [拡張性の担保](#拡張性の担保)
- [設計判断の言語化](#設計判断の言語化)
- [スコープ判断](#スコープ判断)
- [想定したリスクと前提](#想定したリスクと前提)
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

本設計が重視する原則は次の 4 つ。

- **API 境界の隠蔽**: 薄いラッパで GitHub API を隠蔽し、UI からはドメイン型のみを扱う(外部 API の仕様変更を境界で吸収する)。
- **状態の分離**: サーバー状態(検索結果・詳細)、URL 由来のクライアント状態(検索クエリ・フィルタ・ページ)、ローカル UI 状態を明確に分ける。
- **一方向の拡張経路**: 新しいフィルタやカラムは「型 → URL → fetcher → UI」の一方向で追記できる構造にする。
- **4 状態の明示分岐**: loading / error / empty / success を全画面で必ず分岐させ、共通コンポーネントに集約する。

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

### 構成判断: feature-based を採用する

検索画面 / 詳細画面の 2 画面構成においても、フラット構成(`components/` / `hooks/` 横並び)ではなく feature-based(縦割り)を採用した。

**採用理由**:

1. **拡張時の影響範囲が局所化される**。「ユーザー検索」「Issue 検索」など同型の機能を追加する場合、`features/issue-search/` を並列に作るだけで完結する。横割りだと機能横断の責務が `components/` や `hooks/` に混ざり、追加・削除のたびに横断検索が必要になる。
2. **関心の分離が物理構造で担保される**。`features/repo-search/` と `features/repo-detail/` の間で直接 import しないルールにより、機能間の結合を構造的に防げる。共有が必要になった時点で初めて `lib/` か `ui/` に昇格させる。
3. **責務の所在が明確**。あるバグや変更要求に対して、どの feature を見ればよいかが命名から即座にわかる。

**運用ルール**:

- **共有判断は YAGNI**: 2 つ以上の feature で実際に使われるまで、コンポーネント・hook を `ui/` や `lib/` に昇格させない。
- **feature 間の直接 import を禁止**: `features/A` から `features/B` の中身を import しない。共有が必要なら `lib/` か `ui/` に上げる。
- **`features/*/index.ts` を公開境界とする**: feature の外からは `index.ts` で export されたものだけ参照可能。

### 配置方針の理由

- **`app/` は薄く保つ**: ルーティングと SSR 境界(`generateMetadata` 等)、および GitHub プロキシ用 Route Handler に限定。ビジネスロジックは `features/` と `lib/` に逃がす。
- **`lib/github/` で GitHub API を完全に隠蔽**: UI からは「ドメイン型 `Repository`」のみを参照させる。GitHub のスキーマ変更や別ソースへの差し替えに耐える境界。
- **`ui/states/` を独立化**: Loading / Error / Empty を全画面で共通化し、UX のばらつきを防ぐ。

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

### 責務の分離方針

- **「状態を持つ」のは page と hook だけ**。`RepoList` などの提示用コンポーネントは props のみで動く純粋関数的に保つ(テスト容易性が上がる)。
- **fetch は hook に閉じ込める**(`useRepoSearch`, `useRepoDetail`)。コンポーネントは TanStack Query の `data / status / error` を受け取って分岐するだけ。
- **URL ↔ state の同期は `useRepoSearchQuery` 一箇所**に集約。これにより「検索条件はリロードで失われない」「シェア可能」「戻る/進むで履歴を辿れる」を満たす。

---

## 状態管理

| 種別                       | 何を                                                | どこで管理                                       | 理由                                                                         |
| -------------------------- | --------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------- |
| サーバー状態               | 検索結果 / 詳細                                     | **TanStack Query**                               | キャッシュ・再取得・状態分岐を標準化。queryKey で URL パラメータと整合させる |
| URL 由来のクライアント状態 | `q`, `language`, `sort`, `order`, `page`, `perPage` | **Next.js `useSearchParams` + `router.replace`** | リロード耐性・共有可能性・戻る進む対応。Zustand 等の追加 store は不要        |
| 純粋なローカル UI 状態     | `SearchBarInner` の入力途中値                       | **`useState`**                                   | スコープが狭く永続不要                                                       |

**queryKey 設計**:

```ts
["repos", "search", { q, language, sort, order, page, perPage }];
["repos", "detail", { owner, name }];
```

URL の検索パラメータをそのまま key に使うことで、URL を真実の源とし、戻る/進むで自動的に別キャッシュが当たる構造にしている。デフォルト値(例: `perPage=10`)は URL に出さず、URL を綺麗に保つ。

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

ブラウザは `api.github.com` を直接叩かず、Next.js の **Route Handler 経由**で GitHub を呼ぶ。これは GitHub トークンをクライアントに露出させないためで、トークンは `process.env.GITHUB_TOKEN`(`NEXT_PUBLIC_` プレフィックスを使わない)からサーバー側でのみ読まれ、`Authorization` ヘッダはサーバー → GitHub 間にのみ存在する。

### レスポンス検証

`lib/github/schema.ts` に zod スキーマを定義 → `mappers.ts` でドメイン型に変換。**UI に GitHub 生レスポンスを到達させない**。スキーマは GitHub REST API バージョン `2022-11-28` の `search/repositories` と `repos` を一次情報として、本アプリで使うフィールドのみを抜粋している(コメントに公式ドキュメントへのリンクを記載)。

### キャッシュ戦略

- **TanStack Query**: `staleTime` は 一覧 60s / 詳細 5min。`keepPreviousData` でページ送りの体感を改善しつつ、検索条件変更時 (`isPlaceholderData=true`) はスケルトンに切り替える。
- **Next.js fetch キャッシュ**: Route Handler 内の `fetch` で `next: { revalidate: 60 }`(検索)/ `300`(詳細)を指定。

### エラーハンドリング

| エラー型          | きっかけ                         | UI 挙動                                              | リトライ             |
| ----------------- | -------------------------------- | ---------------------------------------------------- | -------------------- |
| `ValidationError` | 空クエリ等で 400                 | フォームで弾く / `<ErrorState>` で「入力エラー」表示 | しない               |
| `NotFoundError`   | 404                              | 詳細で `notFound()` → 404 画面                       | しない               |
| `RateLimitError`  | 403 + `X-RateLimit-Remaining: 0` | リセット時刻を表示し、ボタンを disabled              | しない               |
| `NetworkError`    | fetch 失敗                       | `<ErrorState onRetry>`                               | 2 回(指数バックオフ) |
| `UnknownApiError` | その他 5xx 等                    | `<ErrorState onRetry>`                               | 1 回                 |

`lib/github/client.ts`(サーバー側)と `lib/api-client.ts`(クライアント側)の二段で `Response` を型付きエラーに変換する。UI は `instanceof` で分岐する。

---

## ユーザーインタラクション

### 検索

- 入力は `SearchBar` 内のローカル state で保持し、確定(Enter or 検索ボタン)で初めて URL を更新する。空文字は弾く。
- URL 更新 → `useSearchParams` → queryKey が変わる → 自動 refetch。
- `defaultValue` を React の `key` にして input を再生成することで、URL 由来の値変更にも追従する(`useEffect` + `setState` を避けた実装)。

### フィルタ

- `language`: 固定リスト(TypeScript / JavaScript / Python / Go / Rust / Ruby / Java / C++)から選択。`q` に混ぜず `language` パラメータとして URL に保持し、`buildSearchPath` で qualifier に組み立てる。状態が URL を見ただけでわかる。
- 変更時は `page` を 1 にリセット(古いページが空ヒットになるのを防ぐ)。

### ソート

- `sort` ∈ `stars | forks | updated | best-match`、`order` ∈ `asc | desc`。
- 既定は best-match(GitHub のデフォルト)。`best-match` 時は `order` セレクトを無効化。

### ページネーション・表示件数

- `perPage` を 10 / 30 / 50 / 100 から選択(URL に `perPage` として同期、デフォルト 10 は URL から省略)。`page` も URL に保持。
- `total_count` から総ページ数を出すが、**GitHub の制約で最大 1000 件**で頭打ちすることを UI で明示する。
- prev / next と「N 件中 X - Y 件目」表示。

### 詳細からの戻り

- `BackToSearchButton` は `window.history.length > 1` を `useSyncExternalStore` で読み、履歴があれば `router.back()`、無ければ `/` への `Link` にフォールバックする。これにより検索結果から開いた場合は **検索クエリ・フィルタ・ページが完全に復元**される。

---

## 画面状態(loading / error / empty / success)

すべての fetch を行う画面で **明示的に 4 状態を分岐**する。

```tsx
if (query.isError) return <ErrorState error={query.error} onRetry={refetch} />;
if (query.isPending || query.isPlaceholderData) return <SkeletonList ... />;
if (data.items.length === 0) return <EmptyState ... />;
return <RepoList items={data.items} />;
```

- **Loading**: 一覧はカード形状のスケルトン(CLS を起こさない)。詳細はテキストインジケータ。
- **Error**: 型付きエラーごとに `<ErrorState>` 内で文言とリトライ可否を分岐(レート制限は時刻表示しリトライ不可、ネットワーク・5xx はリトライ可、ValidationError / NotFoundError はリトライ不可)。
- **Empty**: ヒット 0 件のときに「`{q}` に一致するリポジトリはありません」を表示。
- **Success**: 結果表示。

`aria-live="polite"`(Loading)/ `aria-live="assertive"`(Error)を付与し、SR 利用者にも状態変化を通知する。

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

- **zod でレスポンス検証**: GitHub の仕様変更を fetch 層で検知し、UI に不正データを到達させない。`.strict()` は使わず、未知フィールド追加で破綻させない(既知フィールドの型変更は parse エラーになる)。
- **型付きエラー** (`lib/errors.ts`): `RateLimitError` / `NotFoundError` / `NetworkError` / `ValidationError` / `UnknownApiError`。`instanceof` で UI 分岐。
- **Error Boundary**: `app/error.tsx` を配置し、`digest` を表示して調査可能にする。
- **Retry 戦略**: TanStack Query の `retry` は **5xx と Network のみ最大 2 回、指数バックオフ**。4xx はリトライしない(レート制限はリセット時刻に従う)。

### パフォーマンス

- TanStack Query の `staleTime` を 一覧 60s / 詳細 5min に設定。
- 検索条件変更時は `isPlaceholderData` でスケルトンに切り替え、UX の認知負荷を下げる。
- `next/image` で owner アバターを表示(`unoptimized=true`。外部画像のサイズ未知のため遅延ロードに留める)。
- features 単位でコード分割される構造。

### セキュリティ

- **GitHub トークンはサーバー側のみ**: `process.env.GITHUB_TOKEN` を `NEXT_PUBLIC_` プレフィックスなしで管理。
- **Route Handler 経由でプロキシ**: `app/api/github/...` で GitHub API を中継し、`Authorization` ヘッダはサーバー → GitHub 間にしか存在しない。
- `dangerouslySetInnerHTML` を一切使用しない。

### アクセシビリティ

- ランドマーク要素 (`<header>`, `<main>`, `<nav>`) を明示。
- フォーム要素には `<label>` を関連付け、`role="search"` を付与。
- フォーカスリングを残し、`focus:ring` で視認性を確保。
- `aria-live` でローディング・エラーの状態変化を通知。
- キーボードのみで「検索 → 結果選択 → 詳細遷移 → 戻る」が完走できることを Playwright で担保。

### 国際化・表記の堅牢化

- 日付: `Intl.RelativeTimeFormat` で「3 日前」、それ以上は `Intl.DateTimeFormat` で日付表示。
- 数値: `Intl.NumberFormat` で `1,234`、1,000 以上は `compact` 表記で `1.2万` 等に。

### 観測性(注入点)

- Error Boundary でクライアントエラーを集約できる構造。
- サーバー側ログは Route Handler / `lib/github/client.ts` に集約され、`pino` 等への差し替えポイントが 1 箇所。

### 品質ゲート

- TypeScript `strict: true` + `noUncheckedIndexedAccess: true`。
- ESLint(`next/core-web-vitals` 系)+ Prettier。CI で `format:check` を強制。
- Vitest + Testing Library + MSW(コンポーネント / 単体)、Playwright(E2E)。
- **GitHub Actions** で `format:check / lint / typecheck / test / build / e2e` を実行。バッジは README 冒頭に貼付。

### DX / 運用

- パッケージマネージャを **pnpm** に固定、`packageManager` フィールドを `package.json` に明記。
- `.env.example` を配置。`.gitignore` の `.env*` パターンを `!.env.example` で逃がしてある。
- スクリプト: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:watch`, `test:e2e`, `format`, `format:check`。

---

## 拡張性の担保

- **新フィルタ追加**(例: `topic`)の手順:
  1. `SearchParams` 型に `topic?: string` を足す
  2. `buildSearchPath` の qualifier 組み立てに 1 行追加
  3. `useRepoSearchQuery` の URL ↔ state マッピングに 1 行追加
  4. `FilterPanel` に UI を 1 つ追加
- **新カラム追加**(例: 一覧に license 表示):
  1. `RepositorySummary` 型に追加(必要なら zod スキーマも)
  2. `mappers.ts` で詰める
  3. `RepoListItem` に表示を 1 行追加
- **別データソース**(例: GitLab):`lib/github/` と並列に `lib/gitlab/` を作り、`mappers.ts` で同じ `Repository` 型に詰めれば UI は変更不要。
- **別画面の追加**(例: Issue 検索):`features/issue-search/` を縦に追加するだけで、既存 feature には影響しない。

---

## 設計判断の言語化

| 判断                                         | 採用理由                                                             | 不採用案と理由                                                         |
| -------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| App Router + Client Component 中心           | 検索 UI はインタラクション重視で TanStack Query の方が状態管理が素直 | 全 Server Component: URL → 再 SSR の往復が増え、入力体験が悪化         |
| TanStack Query                               | キャッシュ・状態分岐・refetch を標準化                               | SWR でもよいが、`setQueryData` 等のリッチな API が将来役立つ           |
| URL を真実の源                               | リロード/共有/履歴に強く、UX 配慮に直結                              | Zustand 等の store: URL と二重管理になり破綻しやすい                   |
| zod でレスポンス検証                         | GitHub の仕様変更を fetch 層で検知でき、UI まで型崩れが波及しない    | 検証なし: プロダクション想定としては弱い                               |
| Route Handler 経由のプロキシ                 | トークンをクライアントに露出させない                                 | クライアント直接 fetch: トークンを `NEXT_PUBLIC_` で持つ必要があり論外 |
| `features/` 縦割り                           | 拡張時の影響範囲が局所化し、関心の分離が物理構造で担保される         | `components/` の横割り: 画面横断の責務が混じり拡張で破綻               |
| Loading/Error/Empty を `ui/states/` で共通化 | 文言・スケルトンの一貫性、UX のばらつき防止                          | 各画面で都度書く: エッジケースの抜けが出やすい                         |
| Watchers に `subscribers_count` を採用       | GitHub の `watchers_count` は stars と同値であり、実態を表さない     | `watchers_count` をそのまま使う: 数値が嘘になる                        |

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

## 想定したリスクと前提

- GitHub の `search/repositories` は **未認証で 10 req/min** と厳しい。デモ時はトークン投入を想定し、レート制限 UI(`RateLimitError`)を明示。
- `watchers_count` は実態と異なるため、詳細では `subscribers_count` を Watchers として採用(`watchers_count` が存在しない場合はフォールバック)。
- ページネーションは GitHub の制約で 1000 件で打ち切られるため、`Pagination` で明示。
- GitHub の API スキーマ追加には `.strict()` を付けないことで耐性を持たせている。型変更は zod parse でエラーとなり、UI に到達する前に Error Boundary で吸収される。

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
