# GitHub Repository Search

GitHub のリポジトリを検索・閲覧できる Web アプリケーション。Next.js (App Router) で実装した技術課題提出物。

> 設計の詳細は [DESIGN.md](./DESIGN.md) を参照してください。

---

## スクリーンショット

### 検索画面

<img width="1024" height="756" alt="CleanShot 2026-05-26 at 16 36 51" src="https://github.com/user-attachments/assets/35bfbe5d-df7d-45a8-b975-acde60d60f7c" />

### 結果一覧

<img width="1060" height="820" alt="CleanShot 2026-05-26 at 16 37 11" src="https://github.com/user-attachments/assets/1a05e3f6-5247-4d66-8d07-f3ea0d214454" />

### 詳細画面

<img width="1053" height="638" alt="CleanShot 2026-05-26 at 16 37 19" src="https://github.com/user-attachments/assets/1a919cb1-2db1-4a2f-9f53-d4528c5bf63d" />

---

## 動かし方

### 必要環境

- Node.js `>=20.11`
- pnpm `>=9`

### セットアップ

```bash
pnpm install
cp .env.example .env.local
# .env.local に GITHUB_TOKEN を設定(取得手順は下記)
pnpm dev
```

`http://localhost:3000` で起動します。

### GITHUB_TOKEN の取得

1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens**
2. `Public Repositories (read-only)` のみを許可
3. 発行されたトークンを `.env.local` の `GITHUB_TOKEN` に設定

> 未設定でも動作しますが、未認証は **10 req/min** のレート制限にすぐ達します。トークン付きでは 30 req/min まで緩和されます。トークンは **サーバー側でのみ** 使用し、クライアントには露出しません(Route Handler でプロキシ)。

### スクリプト

| コマンド | 内容 |
|---|---|
| `pnpm dev` | 開発サーバー起動 |
| `pnpm build` | 本番ビルド |
| `pnpm start` | 本番起動 |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript 型チェック |
| `pnpm test` | Vitest(単体・コンポーネント) |
| `pnpm test:e2e` | Playwright(E2E) |
| `pnpm format` | Prettier |

---

## 技術スタックと採用理由

| 技術 | 採用理由 | 不採用案 |
|---|---|---|
| **Next.js 16 (App Router)** | 課題指定。Server / Client の境界を明示でき、Route Handler で API プロキシが書ける | Pages Router: 課題指定外 |
| **TanStack Query** | キャッシュ・状態分岐・refetch を標準化、queryKey で URL と整合 | SWR: 同等だが `setQueryData` 等のリッチさで採用 |
| **URL を真実の源** (`useSearchParams`) | リロード/共有/履歴に強い | Zustand: URL と二重管理で破綻リスク |
| **zod** | レスポンスを境界で検証し UI に不正データを到達させない | 検証なし: プロダクション想定として弱い |
| **shadcn/ui + Tailwind** | コピペで持ち込め、依存が膨らまない | MUI: 重く、デザインカスタマイズの自由度が落ちる |
| **MSW** | コンポーネント/E2E で同一ハンドラを使い回せる | jest.mock: ネットワーク層をモックする方が現実的 |
| **Vitest** | Vite と統合され高速、Jest 互換 API | Jest: 設定が重い |

---

## アーキテクチャ

```
app/                   ルーティングと SSR 境界(薄く保つ)
 └─ api/github/...     GitHub API プロキシ(トークン秘匿)

features/              画面単位の縦割り
 ├─ repo-search/       検索画面のコンポーネント・hook
 └─ repo-detail/       詳細画面のコンポーネント・hook

lib/github/            GitHub API を完全に隠蔽する境界
 ├─ client.ts          fetch ラッパ + エラー変換
 ├─ schema.ts          zod スキーマ
 └─ mappers.ts         レスポンス → ドメイン型

types/                 ドメイン型(UI が依存する唯一の型)
ui/states/             Loading / Error / Empty の共通コンポーネント
```

設計判断の詳細は [DESIGN.md](./DESIGN.md) を参照。

### なぜ feature-based か(2 画面でこの粒度に切る理由)

本課題は画面が検索 / 詳細の 2 つしかなく、フラット構成(`components/` 横並び)でも十分実装可能。それでも縦割りを選んだのは以下の判断による。

- 評価軸の **「拡張性」** に対し、「ユーザー検索 / Issue 検索を足す = `features/` を並列に追加」と直接答えられる。
- `features/A` から `features/B` を import しないルールで、**関心の分離が物理構造で担保される**。
- 「過剰設計では」という批判への先回り: **2 つ以上の feature で使うまで `ui/` や `lib/` に昇格させない**(YAGNI)、**feature 間で直接 import しない**(ESLint で機械的に禁止)という運用ルールをセットで導入。

不採用案: フラット構成。実装は通るが、設計判断として語る材料が薄く、評価軸「拡張性」へのアピール力が落ちる。

---

## 状態管理方針

| 種別 | 対象 | 管理場所 |
|---|---|---|
| サーバー状態 | 検索結果 / 詳細 | TanStack Query |
| URL 由来のクライアント状態 | キーワード / language / sort / order / page | `useSearchParams` + `router.replace` |
| 純粋なローカル UI 状態 | 入力途中の値, Popover 開閉 | `useState` |

---

## エラーハンドリング

| エラー型 | きっかけ | UI 挙動 |
|---|---|---|
| `ValidationError` | 空クエリで送信 | フォームで弾く |
| `RateLimitError` | 403 + `X-RateLimit-Remaining: 0` | リセット時刻を表示、ボタン disabled |
| `NotFoundError` | 404 | 詳細で `notFound()` |
| `NetworkError` / 5xx | ネット断・サーバー障害 | `<ErrorState onRetry>` + 指数バックオフで自動 retry(最大 2 回) |
| `UnknownError` | その他 | エラー境界で `digest` 表示 |

---

## テスト戦略

- **単体 (Vitest)**: `lib/github/mappers.ts`(GitHub → ドメイン型変換) / `lib/github/client.ts`(ステータス別エラー変換)
- **コンポーネント (Vitest + Testing Library + MSW)**: 検索画面の loading / error / empty / success の 4 状態を MSW で再現。詳細画面の 404 ハンドリング
- **E2E (Playwright)**: 検索 → 一覧 → 詳細遷移の Happy Path、キーボードのみで完走できる a11y ケース

---

## プロダクション観点チェックリスト

- [x] zod でレスポンス検証(API 仕様変更を境界で吸収)
- [x] 型付きエラー(RateLimit / NotFound / Network / Validation)
- [x] Error Boundary (`app/error.tsx`, `app/global-error.tsx`)
- [x] GitHub トークンはサーバー側のみ(Route Handler でプロキシ)
- [x] CSP / Referrer-Policy / X-Content-Type-Options
- [x] `aria-live` でローディング・エラー通知、キーボード操作完走、`eslint-plugin-jsx-a11y`
- [x] `Intl.NumberFormat` / `Intl.DateTimeFormat` で数値・日付の表記を堅牢化
- [x] Web Vitals 計測フック / 構造化ログの注入点
- [x] TypeScript `strict` + `noUncheckedIndexedAccess`
- [x] GitHub Actions で lint / typecheck / test / build
- [x] `pnpm` 固定 / `engines` 指定 / `.env.example`

---

## スコープ判断

### やったこと

- 検索・フィルタ(language)・ソート(stars/forks/updated)・ページネーション
- 詳細画面(stars / watchers (subscribers) / forks / open issues)
- loading / error / empty / success の 4 状態を全画面で明示
- GitHub API のプロキシ化とトークン秘匿
- 単体 / コンポーネント / E2E のテスト

### やらなかったこと(理由付き)

- **ユーザー認証 / OAuth**: 課題スコープ外。トークンはサーバー env で十分
- **無限スクロール**: ページネーションの方が「現在地」が明確で、URL シェアに強い。スクロール位置リセット問題も避けられる
- **お気に入り / 検索履歴**: 永続化先(ローカルストレージ or DB)の選定が課題スコープを超える
- **i18n**: 文言は定数化済みで、`next-intl` への移行点だけ用意
- **ダークモード切替**: shadcn/ui の既定に任せる

---

## AI 利用レポート

本課題では Anthropic Claude (Claude Code, Opus 4.7) を活用した。透明性のため利用方針を記録する。

### 使ったツール

- **Claude Code (Opus 4.7, 1M context)**: ターミナル統合の AI コーディングエージェント

### フェーズ分けでの活用

| フェーズ | AI に任せたこと | 人間が判断したこと |
|---|---|---|
| 要件理解 | 課題 URL の要約抽出 | 評価軸の重み付け |
| 設計 | DESIGN.md のドラフト生成、選択肢の比較表 | アーキテクチャ判断(API 隠蔽、URL を真実の源とする方針、状態管理の三層分離) |
| README | 構成案の生成、技術選定の対比表 | 採用理由・不採用案の最終判断、スコープ判断の境界 |
| 実装 | ボイラープレート、コンポーネント雛形、型定義、テストコード生成 | API 境界(`lib/github/`)の設計、エラー型の分類、レビュー判断 |
| テスト | テストケースのひな形 | 何を担保するかの選定、MSW ハンドラの境界設計 |

### プロンプトの工夫

- **設計 → README → 実装 → レビュー** のフェーズを明示的に分け、設計が固まってから実装に入った。これにより手戻りを抑え、AI 出力をレビュー可能な粒度に保った。
- AI に「不採用案も挙げて理由を書け」と依頼することで、判断の言語化を強制し、コピペ採用を避けた。
- API レスポンス型は **公式ドキュメントを必ず一次情報として確認** し、AI 出力をそのまま信用しなかった(GitHub の `watchers_count` のような罠を回避)。

### 採用しなかった AI 提案の例

<!-- 実装フェーズで発生したものを追記 -->
- (例)`watchers_count` を Watchers として使う初期案 → 実態は subscribers のため `subscribers_count` に変更
- (例)状態管理に Zustand を勧める提案 → URL を真実の源とする方針と衝突するため不採用

### 効果と限界

- **効果**: 設計ドラフトの初速、選択肢の網羅、テストケースの抜け漏れ防止
- **限界**:
  - ライブラリ API のハルシネーション(廃止オプション、存在しないフラグ)。対策: 公式ドキュメント / 型定義での照合
  - 「動けば良い」レベルのコード生成に流れがち。対策: 設計書を先に固定し、それに従わせる
  - スコープ判断は AI に任せない(過剰実装を避けるため人間が決定)

---

## 今後の拡張ポイント

- 認証付きアクセス(個人 OAuth)でレート制限を緩和
- 無限スクロール / Virtualized list
- 検索履歴 / お気に入り(ローカルストレージ)
- ユーザー検索 / Issue 検索への横展開(`features/` 縦割りなので並列追加可)
- i18n (`next-intl`)
