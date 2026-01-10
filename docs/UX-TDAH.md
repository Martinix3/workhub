# Guía UX (TDAH) — WorkHub

Este documento es **norma de diseño** para WorkHub. Su objetivo es que la app sea **TDAH-friendly**: mínima carga cognitiva, sin ruido, sin desbordes y con flujos predecibles.

## Reglas no negociables (aplican a todo el portal)

1) **Cero desbordes**
- Ninguna tarjeta puede salirse de su columna/contenedor.
- Títulos largos: **siempre** con truncado + tooltip o “ver más” (nunca rompen layout).
- Si un listado crece: scroll **dentro** del panel, no página infinita.

2) **Divulgación progresiva**
- En pantalla principal/boards: solo lo esencial (título + 2–4 señales).
- Edición y acciones “avanzadas” van a **un panel/modal** al hacer click.

3) **Ley de Hick (mínimas decisiones por pantalla)**
- Máximo 1 acción principal visible por área (ej. “Crear tarea”).
- Acciones secundarias en menú “⋯” o dentro del detalle.

4) **Jerarquía visual clara**
- La información crítica (qué hacer ahora) debe ser lo más prominente.
- Espacio en blanco generoso y secciones bien separadas.

5) **Consistencia y predictibilidad**
- Mismos patrones (botones, filtros, modales, listas) en todas las vistas.
- Textos y etiquetas consistentes; todo en **español**.

6) **Soporte a funciones ejecutivas**
- El sistema actúa como “memoria externa”: contexto visible, estado claro, próximos pasos evidentes.
- Minimizar cambios de contexto: lo que se pueda hacer en el portal, se hace en el portal.

## Patrón UI obligatorio: “Tarjeta compacta + Detalle”

### Tarjeta (en tableros/listados)
Mostrar solo:
- `Título`
- `Responsable` (avatar/nombre corto)
- `Vence` (fecha o “—”)
- `Prioridad` (P0/P1/P2)
- `Indicadores` (ej. “ERP pendiente”, “Bloqueada”)

Prohibido en la tarjeta:
- Selects múltiples, formularios inline, botones repetidos (iniciar/detener/log).
- Descripciones largas.

### Detalle (panel/modal al click)
Aquí sí se permite:
- Cambiar estado/responsable/fecha/prioridad.
- Ver/abrir contexto ERP/CRM.
- Acciones de tiempo (iniciar/detener/registrar).
- “Completar en ERP” y mensajes de error completos.

## Checklist rápido (antes de hacer merge)
- [ ] ¿Hay algún texto/elemento que desborde o rompa el grid?
- [ ] ¿La vista se entiende en <10s sin leer mucho texto?
- [ ] ¿La vista muestra solo lo esencial y el resto está “dentro” del detalle?
- [ ] ¿Hay más de 1–2 acciones visibles por tarjeta? (si sí: mover a detalle)
- [ ] ¿Todo está en español y con términos consistentes?
- [ ] ¿El tablero evita “scroll infinito”? (scroll dentro de columna/panel)
- [ ] ¿Existe un camino único y obvio para completar la acción principal?

## Referencia (texto original del usuario)
La guía completa aportada por el usuario queda registrada abajo como **Anexo**. Si hay conflicto, prevalecen las “Reglas no negociables” de arriba.

---

## Anexo — Guía de Mejores Prácticas de Diseño UI/UX para Usuarios con TDAH (texto original)

### 1. Introducción: Diseñar para la Neurodiversidad en el Entorno Profesional

En el entorno profesional actual, el diseño de interfaces de usuario ha trascendido la mera estética para convertirse en un pilar estratégico de la productividad. Sin embargo, los sistemas de gestión tradicionales a menudo fallan a una porción significativa de la fuerza laboral, particularmente a los usuarios con Trastorno por Déficit de Atención e Hiperactividad (TDAH). Estas herramientas, diseñadas bajo la presunción de un funcionamiento cerebral lineal, pueden generar una severa sobrecarga cognitiva, llevando a la frustración y al eventual abandono de la plataforma.

Es crucial entender que el TDAH no representa una falta de disciplina, sino una diferencia fundamental en el "cableado" cerebral que impacta directamente en las funciones ejecutivas. Por ello, el software moderno debe evolucionar de ser un mero sistema de registro a actuar como una "prótesis cognitiva", un asistente que externaliza la memoria, la organización y la motivación.

Para diseñar soluciones verdaderamente efectivas, primero debemos comprender la arquitectura cognitiva única del cerebro con TDAH y los desafíos que esta presenta en la interacción con sistemas complejos.

### 2. Fundamentos Cognitivos: Comprendiendo el Cerebro con TDAH

Antes de aplicar cualquier técnica de diseño, es imperativo que los diseñadores y desarrolladores comprendan los principios neurocognitivos que rigen la experiencia de un usuario con TDAH. Este conocimiento es la base para crear experiencias de usuario que sean genuinamente útiles y no meramente estéticas o superficiales. Sin este fundamento, corremos el riesgo de crear herramientas que, en el mejor de los casos, son ineficaces y, en el peor, añaden más frustración.

La investigación científica ha identificado que el TDAH afecta principalmente a las funciones ejecutivas, las habilidades de gestión del cerebro. Los desafíos clave incluyen:

* Memoria de trabajo (Working memory): La dificultad para retener y manipular múltiples hilos de información de forma simultánea. Esto puede hacer que seguir procesos de varios pasos o recordar datos críticos mientras se navega por una interfaz sea extremadamente difícil.
* Flexibilidad cognitiva (Cognitive flexibility): El desafío de cambiar de manera fluida y eficiente entre tareas heterogéneas. El "costo" de este cambio de contexto es significativamente más alto, lo que puede llevar a la parálisis por análisis.
* Control inhibitorio (Inhibitory control): La dificultad para resistir distracciones, tanto internas (ideas nuevas) como externas (notificaciones, elementos visuales irrelevantes).

Estos desafíos convergen en un concepto central para el diseño de interfaces: la Carga Cognitiva. Se refiere a la cantidad total de esfuerzo mental que se requiere para usar un producto. A continuación, se desglosan los tres tipos de carga cognitiva y cómo el diseño puede gestionarlos estratégicamente:

| Tipo de Carga Cognitiva | Descripción | Estrategia de Diseño Clave |
|---|---|---|
| Intrínseca | La complejidad inherente a la información o tarea. Es el esfuerzo mental necesario para comprender el concepto en sí. | Simplificar los datos en fragmentos más pequeños y concisos; usar KPIs (Indicadores Clave de Desempeño) y vistas jerárquicas que permitan un desglose progresivo. |
| Extrínseca | El esfuerzo innecesario causado por una mala presentación de la información (interfaz confusa, desordenada, inconsistente). | Eliminar el ruido visual, seguir un diseño jerárquico claro, usar iconografía estándar y mantener la consistencia en todos los flujos de trabajo. |
| Germana | El esfuerzo mental productivo que conduce al aprendizaje, la formación de esquemas mentales y la toma de decisiones acertadas. | Fomentar la interacción y el procesamiento profundo mediante elementos como filtros interactivos, desgloses (drill-downs) y visualizaciones de datos que inviten a la exploración. |

El desafío, por tanto, no es eliminar la carga cognitiva, sino erradicar la extrínseca para maximizar la capacidad del usuario para la germana. Los siguientes principios de diseño son el arsenal táctico para lograr este equilibrio.

### 3. Principios Fundamentales de Diseño UI/UX para el TDAH

Esta sección constituye el núcleo de la guía, presentando un conjunto de principios accionables que traducen la neurociencia del TDAH en estrategias de diseño efectivas. Estas no son simples preferencias estéticas, sino tácticas fundamentadas para mitigar los desafíos de las funciones ejecutivas y crear interfaces que potencien las fortalezas inherentes del usuario neurodivergente.

#### 3.1. Reducción Radical de la Carga Cognitiva Extrínseca

El objetivo principal es minimizar el esfuerzo mental desperdiciado. Esto se logra a través de dos conceptos clave:

* Claridad y Minimalismo Funcional: La ambigüedad es el enemigo. Cada elemento en la interfaz debe tener un propósito claro. El diseño debe permitir a los usuarios "ver, entender y actuar con confianza". Esto implica eliminar cualquier elemento visual, texto o funcionalidad que no contribuya directamente a la tarea del usuario.
* Ley de Hick: Este principio establece que el tiempo necesario para tomar una decisión aumenta con el número y la complejidad de las opciones. Para un cerebro con TDAH, esto se magnifica. Por lo tanto, debemos reducir drásticamente el número de opciones disponibles en cualquier pantalla, tanto en acciones como en elementos visuales que compiten por la atención.

#### 3.2. Estructura y Jerarquía Visual

Una vez simplificada la interfaz, debemos organizar lo que queda de una manera que guíe la atención del usuario de forma intuitiva.

* Jerarquía de Información: El "peso" visual de un elemento (su tamaño, color, contraste y posición) debe denotar su importancia. La información más crítica debe ser la más prominente, creando un camino visual claro que el usuario pueda seguir sin esfuerzo consciente.
* Divulgación Progresiva (Progressive Disclosure): La información compleja se procesa mucho más fácilmente cuando se presenta en "pequeños bocados". Al igual que un número de teléfono se divide en grupos, las interfaces complejas deben ocultar los detalles avanzados, mostrando primero la información general y permitiendo al usuario profundizar solo cuando sea necesario.
* Estructura de Encabezados Clara y Espacio en Blanco: Una estructura jerárquica de encabezados (H1, H2, H3) hace que las páginas sean más escaneables y digeribles. El uso generoso del espacio en blanco es igualmente crucial; separa los elementos, reduce la sensación de desorden y ayuda al usuario a procesar la información.

#### 3.3. Consistencia y Predictibilidad

El cerebro con TDAH se beneficia enormemente de los patrones predecibles, ya que reducen la necesidad de aprender y procesar nueva información en cada paso.

* Patrones de Interfaz Consistentes: Elementos y flujos de trabajo deben comportarse de la misma manera en toda la aplicación. Como en la arquitectura de Leantime, si un usuario aprende a filtrar una lista de tareas, debe poder aplicar ese mismo conocimiento para filtrar otros elementos sin esfuerzo cognitivo adicional.
* Rutas de Navegación Predecibles: La consistencia crea un modelo mental claro del sistema, lo que reduce la ansiedad y el esfuerzo cognitivo. Es fundamental adherirse a las convenciones de diseño establecidas, ya que desviarse de ellas solo por "ser diferente" obliga al usuario a pensar en elementos que deberían ser intuitivos.

#### 3.4. Soporte para las Funciones Ejecutivas

El diseño debe actuar como un andamiaje externo para las funciones ejecutivas que son desafiantes para los usuarios con TDAH.

* Externalizar la Memoria y la Organización: La interfaz debe servir como una memoria externa. El uso de Anclajes Visuales (Visual Anchors), como los bloques de tiempo de arrastrar y soltar en Super Productivity, hace que conceptos abstractos como la duración del tiempo sean concretos y visibles, liberando la memoria de trabajo del usuario.
* Flexibilidad sobre Rigidez: Los sistemas de productividad para TDAH deben poder "doblarse sin romperse". Deben acomodar días de alta y baja energía, permitiendo ajustes sin que el sistema se sienta como un fracaso. El enfoque debe cambiar de la gestión del tiempo a la gestión de la energía.

#### 3.5. Diseño Orientado a la Motivación y la Recompensa

Dado que el cerebro con TDAH a menudo está impulsado por la búsqueda de gratificación inmediata, el diseño de la interfaz puede aprovechar esto para mantener al usuario comprometido.

* Diseño Impulsado por la Dopamina: Inspirado en plataformas como Leantime, es vital incorporar elementos visuales que celebren el progreso en tiempo real. Pequeñas animaciones o mensajes de felicitación al completar una tarea proporcionan el refuerzo positivo necesario para mantener la motivación.
* Reconocer el Contexto Emocional: El estado emocional es un predictor significativo del éxito en la finalización de tareas. La capacidad de Leantime de permitir a los usuarios asignar un sentimiento a las tareas mediante emojis es un ejemplo pionero, reconociendo y validando la experiencia del usuario.

### 4. Estrategias Prácticas y Patrones de Diseño

Esta sección traduce los principios teóricos en un catálogo de soluciones de interfaz tangibles. El objetivo es proporcionar a los equipos de desarrollo y diseño un conjunto de herramientas prácticas que pueden implementar directamente para crear sistemas más accesibles y eficaces para usuarios con TDAH.

**Catálogo de Soluciones de Diseño para TDAH**

| Desafío Cognitivo del TDAH | Solución de Diseño UI/UX | Justificación Neurocognitiva |
|---|---|---|
| Sobrecarga de información y parálisis por análisis | Un dashboard principal ultra-enfocado como el "My Work" de Leantime, que filtra inteligentemente solo las tareas del día. | Reduce radicalmente la carga cognitiva extrínseca al eliminar el ruido visual. Protege la memoria de trabajo al presentar solo la información procesable inmediata. |
| Dificultad para iniciar tareas grandes (parálisis de inicio) | Una función de desglose de tareas asistida por IA (AI Task Breakdown de Leantime) que divide proyectos complejos en subtareas manejables. | Mitiga la alta carga cognitiva intrínseca de un proyecto abrumador. Al reducir la complejidad percibida, apoya las funciones ejecutivas de planificación e iniciación. |
| Distracción por ideas nuevas y brillantes | Un "aparcamiento de ideas" (Idea Parking Lot) de Leantime, un espacio de captura rápida accesible desde cualquier lugar. | Protege el control inhibitorio al permitir que el usuario "descargue" el pensamiento distractor sin abandonar el flujo de trabajo principal, reduciendo el costo del cambio de contexto. |
| Percepción inconsistente del tiempo ("ceguera temporal") | Representaciones visuales del tiempo, como los bloques de arrastrar y soltar de Super Productivity. | Externaliza la memoria de trabajo y la percepción del tiempo, convirtiendo un concepto abstracto (duración) en un anclaje visual concreto y tangible. |
| Sensibilidad a la sobreestimulación visual | Un "Modo Escala de Grises" (Grayscale Mode) de Leantime para minimizar las distracciones cromáticas. | Reduce la carga cognitiva extrínseca y permite al usuario controlar su entorno sensorial, facilitando el hiperenfoque al dirigir los recursos atencionales a la tarea principal. |
| Baja motivación para tareas administrativas | Elementos de recompensa variable como el "AI Story time" de Leantime, que crea resúmenes narrativos del progreso. | Activa el sistema de recompensa dopaminérgico del cerebro. El refuerzo positivo variable y sorprendente proporciona la gratificación inmediata necesaria para mantener la motivación. |

### 5. Conclusión: Hacia un Diseño Empático y Eficaz

Este informe ha demostrado que diseñar para usuarios con TDAH no se trata de añadir más funciones. Se trata de un cambio fundamental de filosofía: pasar de sistemas que gestionan información a sistemas que gestionan la atención y la energía del usuario. La clave no está en la cantidad de características, sino en la calidad de la interacción y la reducción deliberada de la carga cognitiva.

Para los equipos de diseño y desarrollo que buscan crear la próxima generación de herramientas profesionales, se recomiendan tres pilares estratégicos:

1. Obsesionarse con la Interfaz por Encima de las Funciones: Priorizar radicalmente la reducción de la carga cognitiva. Cada nueva función debe justificarse no por su existencia, sino por su impacto mínimo en el esfuerzo mental del usuario.
2. Automatizar la Supervisión Mediante IA: Delegar la monitorización de detalles, la detección de anomalías y la captura de datos a agentes de IA para liberar la memoria de trabajo del usuario y permitir el enfoque en tareas de alto valor estratégico.
3. Exigir Arquitecturas Elásticas y Modulares: Adoptar sistemas que se adapten a los ciclos de energía e hiperenfoque del usuario, en lugar de imponer estructuras rígidas. La modularidad debe permitir una adopción incremental que evite la sobrecarga inicial.

La tecnología actual nos brinda una oportunidad sin precedentes para que la neurodiversidad se convierta en una ventaja competitiva tangible. Esto solo será posible si nuestros sistemas están diseñados desde su núcleo para entender, respetar y potenciar la maravillosa variabilidad del cerebro humano.
