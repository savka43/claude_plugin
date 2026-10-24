# dance-buddy

Мод для Claude Code: пока Claude работает и думает, над строкой ввода танцует маленький оранжевый Clawd, маскот Claude Code, а рядом бегают нотки ♪♫. Ход закончился, и танцор уходит со сцены.

## Установка

В терминальной сессии Claude Code:

```
/plugin install dance-buddy --marketplace savka43/claude_plugin
```

Ответь `y` на вопрос о маркетплейсе и выбери область установки (Enter — для пользователя).

Из шелла:

```
claude plugin install dance-buddy --marketplace savka43/claude_plugin
```

В десктопном приложении: + рядом с полем ввода → Plugins → Add marketplace `savka43/claude_plugin` → Add plugin.

## Танцы

| Танец | Команда |
|---|---|
| Диско | `/dance disco` |
| Робот | `/dance robot` |
| Лунная походка — по всей ширине строки | `/dance moonwalk` |
| Макарена | `/dance macarena` |
| Брейк-данс | `/dance breakdance` |

- `/dance next` — следующий танец
- `/dance random` — случайный танец каждый ход (по умолчанию)
- `/dance claude` — Claude сам выбирает танец под задачу, а иногда придумывает свой
- `/dance off`, `/dance on`, или просто `/dance` — выключить и включить

Команда срабатывает сразу, даже посреди ответа Claude.
