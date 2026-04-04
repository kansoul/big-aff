---
name: notion-task
description: >-
  Create tasks in Notion for backend (be), frontend (fe), or fullstack work.
  Use when the user says "tạo task trên Notion", "create a Notion task", "add task to Notion",
  "thêm công việc vào Notion", or asks to create a be/fe/fullstack task.
---

# Notion Task Creator

Creates development tasks (BE, FE, or Fullstack) as pages in a Notion database.
Uses the `@notionhq/notion-mcp-server` configured in `.claude/settings.json`.

## Prerequisites

Set your Notion API key once:
```bash
export NOTION_API_KEY=secret_xxxxxxxxxxxx  # add to ~/.zshrc to persist
```
Then ensure the integration is connected to your task database in Notion (database → **...** → **Connections**).

## Workflow

### 1 — Gather task info

**Do NOT guess or infer any field.** For every required field that is missing, ask the user before proceeding.
For optional fields, list them and ask if the user wants to fill them in.

| Field | Required | Options / Format | Description |
|-------|----------|-----------------|-------------|
| **Title** | Yes | Free text | Tên task, ngắn gọn và rõ ràng |
| **Type** | Yes | `BE` / `FE` / `Fullstack` | Phạm vi công việc |
| **Description** | Yes | Free text | Mô tả chi tiết yêu cầu: cần làm gì, kết quả mong muốn, các điểm cần lưu ý |
| **Status** | Yes | Not started / In progress / Done | Trạng thái hiện tại của task |
| **Priority** | Yes | Low / Medium / High / Urgent | Mức độ ưu tiên |
| **Assign** | No | Tên thành viên | Người thực hiện task |
| **Timeline** | No | `YYYY-MM-DD → YYYY-MM-DD` | Thời gian bắt đầu và kết thúc |

**Quy tắc hỏi:**
- Nếu thiếu bất kỳ field **Required** nào → hỏi ngay, không tạo task cho đến khi có đủ.
- Nếu thiếu field **Optional** → hỏi một lần "Bạn có muốn thêm Assign / Timeline không?", nếu không thì bỏ qua.
- Không tự điền giá trị mặc định cho bất kỳ field nào.

### 2 — Find the database

Use `notion_search` to find the project task database.
Use `notion_retrieve_database` to get the exact property names and types before creating.

### 3 — Create the page

Use `notion_create_page`:
```json
{
  "parent": { "database_id": "<id>" },
  "properties": {
    "Name":        { "title": [{ "text": { "content": "Task title" } }] },
    "Type":        { "select": { "name": "BE" } },
    "Status":      { "status": { "name": "Not started" } },
    "Priority":    { "select": { "name": "High" } },
    "Assign":      { "people": [{ "id": "<user_id>" }] },
    "Timeline":    { "date": { "start": "2025-04-10", "end": "2025-04-15" } }
  },
  "children": [
    {
      "object": "block",
      "type": "paragraph",
      "paragraph": {
        "rich_text": [{ "type": "text", "text": { "content": "<Description>" } }]
      }
    }
  ]
}
```

> Use `notion_retrieve_database` to verify exact property names — they may differ per workspace.

### 4 — Confirm result

Return the created page URL and a one-line summary of the task.

## Examples

```
User: Tao task BE "Fix login API", priority High, assign An
-> search DB -> get schema -> create page (Type=BE, Priority=High, Assign=An) -> return URL

User: Tao task FE "Build dashboard chart", timeline 7/4 - 10/4
-> create page (Type=FE, Timeline=2025-04-07 to 2025-04-10) -> return URL

User: Tao task fullstack "Setup CI/CD", mo ta: config Github Actions
-> create page (Type=Fullstack, Description="config Github Actions") -> return URL
```

## Troubleshooting

- **MCP not available** — Check `NOTION_API_KEY` is exported and restart Claude Code.
- **Database not found** — Add the integration to the database via Notion → Connections.
- **Property name mismatch** — Run `notion_retrieve_database` to get exact names.
