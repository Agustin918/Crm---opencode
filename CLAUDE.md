@AGENTS.md

## Meta Ads Optimization — 2026-06-30

### Token actual (funcionando)
`EAAYSAukaKxoBRyLqVA8RLHtKP2jJspVYgSM1dTF1WLSYALshON8Py4orEanqvuHv4wKmigvopdVjAkuPXCl70VPjKpECH7Q0em0ZBbnZCRHGAceqrOAyG0SZBWAmzvrAWzZBzpRRJxl9qBDWFkn1GMCb5mKmZCayPMZBUr5A9Yz6GXT7p0k7CRtL5bwIHnYRq3jgSynDup6KcYPpZB1ymmrCZBak4kvAlOj1gGXCkFtScaPMK06N619VYUrIFRCQt50Bj3SdBDygW5WF56ZAkOOP7U72MJquNo2GIxf6oYQZDZD`

### Ads pausados (sin leads o rendimiento bajo)
- Carrusel - 1, Carrusel - 2, Carrusel - 3
- Reel - 1, Reel - 2
- Estático - 1, Estático - 1 + CTA

### Ads activos
- **Estático - 2 + CTA** ($92.27/mes) → 13 leads (Meta), mejor calidad
- **Estático - 3** ($64.01/mes) → 7 leads, buen CTR (4.15%)
- **Reel - 3** ($9.59/mes) → 2 leads, CPL $4.80, atrae calientes

### En monitoreo
- **Estático - 3 + CTA** ($5.84, 0 leads)
- **Estático - 2** ($7.05, 2 leads)

### Pendiente
- Hay 7 leads de "Estático - 2 + CTA" en Meta que no llegaron al CRM
- Revisar leads sin asignar en Meta Business Suite

## NotebookLM Setup — 2026-06-30

Instalado `notebooklm-mcp-cli` via uv tool. Autenticado con agustinsalado20@gmail.com.

### MCP Servers configurados
- **~/.opencode.json** → `notebooklm` (local, command: `notebooklm-mcp`)
- **claude_desktop_config.json** → `notebooklm` (local, command: `notebooklm-mcp`)

### Skill
- **~/.config/opencode/skills/notebooklm/SKILL.md** — cargar con `skill:notebooklm`

### CLI
```bash
nlm notebook list                     # Listar notebooks
nlm query <id> "pregunta"             # Consultar notebook
nlm cross query "pregunta"            # Consultar todos
nlm source add url <id> <url>         # Agregar fuente
nlm studio generate audio <id>        # Generar podcast
```

### Pendiente NotebookLM
- Subir los books de marketing digital como fuentes a un notebook
