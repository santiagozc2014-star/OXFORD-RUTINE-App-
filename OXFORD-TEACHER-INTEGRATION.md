# OXFORD 3.0 — aprendizaje adaptativo y profesor

Esta aplicación es una PWA estática. La lista de tareas, el registro académico y las notas se almacenan localmente en el navegador. Exporta una copia desde **Datos** antes de cambiar de dispositivo o borrar los datos del navegador.

## Módulos añadidos

- **Centro de mando:** sesiones y minutos registrados, repasos pendientes, errores abiertos y progreso por materia.
- **Dificultad adaptativa:** diagnóstico al empezar; recuperación cuando aparece un error fundamental; consolidación si las evaluaciones quedan por debajo del 85%; y transferencia solo después de dos resultados recientes de al menos el 85% sin errores fundamentales.
- **Memoria a largo plazo:** repetición espaciada con intervalos crecientes y ajustes según el recuerdo.
- **Laboratorio de ingeniería:** seguimiento de proyectos por fases del proceso tecnológico.
- **Inglés:** evaluación semanal de listening, speaking, reading, writing y gramática/vocabulario, con registro específico de errores de writing.
- **Rutinas:** análisis orientativo de la carga; no añade, elimina ni mueve tareas.
- **Profesor ChatGPT:** genera una instrucción con el tema, el modo de clase, las últimas sesiones, los repasos vencidos y los errores pendientes.

## Qué significa la conexión con ChatGPT

La PWA no puede utilizar automáticamente la sesión privada de ChatGPT ni leer conversaciones de la cuenta. El flujo implementado prepara y copia el contexto; después se abre [ChatGPT](https://chatgpt.com/) y el usuario pega la instrucción. Si ChatGPT ya está iniciado en ese navegador o la URL abre la aplicación instalada con la sesión activa, se puede continuar allí.

Esto no es una integración OAuth ni una conexión de API. La API de OpenAI utiliza credenciales separadas de la suscripción de ChatGPT y las claves secretas nunca deben exponerse en JavaScript del navegador, en una app móvil ni en un repositorio. Una futura integración de JARVIS requerirá un servidor o servicio autenticado, controles de acceso, consentimiento y límites de uso. No incluir claves en el repositorio.

## Datos y privacidad

- Los datos de aprendizaje permanecen en el almacenamiento local del navegador hasta que el usuario exporte, copie o comparta información.
- El botón del profesor solo prepara una instrucción; no envía nada en segundo plano.
- No se guardan contraseñas, cookies ni claves API.
- Los registros de evaluación son introducidos por el usuario y no constituyen una certificación externa del nivel académico.

## Desarrollo y pruebas

No necesita dependencias de terceros para la lógica principal. Ejecuta las pruebas con Node.js 20 o posterior:

\`\`\`bash
node --test tests/oxford-enhancements.test.cjs
\`\`\`

La aplicación se publica mediante el workflow existente de GitHub Pages. El workflow de pruebas ejecuta los casos de lógica de aprendizaje en cada push y pull request.
