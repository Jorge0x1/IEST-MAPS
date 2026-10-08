---
name: commit-helper
description: Usar SIEMPRE al terminar de ayudar con un cambio de código (nueva función, bug fix, refactor, cambio de configuración, estilos, migración de base de datos, etc.), incluso si el usuario no lo pide explícitamente.
---

Al terminar de ayudar con un cambio de código, entrega al final de la respuesta un bloque listo
para copiar con `git add`, `git commit -m "..."` y `git push`. Úsala siempre que hayas creado o
modificado código o archivos de un proyecto durante la conversación, aunque el usuario no pida
el commit, porque el usuario suele olvidarse de hacer commits y push.
Los mensajes el commit que generes deben ser claros y concisos, describiendo los cambios realizados. Si el cambio es muy grande, puedes usar un mensaje de commit más general, pero si es posible, intenta ser específico.
0