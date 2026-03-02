# **Documento Técnico de Especificaciones de Requerimientos del Sistema (ERS)**

## **Plataforma Telemática para la Gestión de Finanzas Personales y Acervo Patrimonial**

**Fecha de Emisión:** 27 de febrero de 2026 **Autoría:** Dirección de Tecnologías de la Información (CTO) **Estado del Documento:** Especificación Técnica Detallada y Exhaustiva

## **1\. Preámbulo y Consideraciones Iniciales**

### **1.1 Objeto del Documento**

El presente documento tiene por objeto la estipulación exhaustiva y rigurosa de las especificaciones técnicas, operativas y de producto inherentes al desarrollo de una aplicación telemática orientada a la gestión de finanzas personales. En el contexto actual, caracterizado por una marcada asimetría en la asimilación de preceptos financieros por parte de la población general, la referida plataforma se erige con el propósito fundamental de democratizar el acceso a instrumentos de gestión y auditoría de grado profesional. En consecuencia, se proveerán los mecanismos necesarios para la administración del flujo de efectivo (ingresos y egresos), la formulación de proyecciones presupuestarias dinámicas, la monitorización del patrimonio neto a través del registro pormenorizado de activos y pasivos, y la emisión de advertencias proactivas relativas a la salud financiera del individuo.

El fin ulterior de esta iniciativa no se circunscribe a la mera tabulación de datos, sino a la provisión de inteligencia financiera de carácter procesable, tendiente a mitigar la incertidumbre inherente a la administración pecuniaria rudimentaria.

### **1.2 Delimitación del Alcance y Demografía Objetivo**

El sistema en cuestión será concebido, en sus estadios iniciales, como una Aplicación de Página Única (SPA, por sus siglas en inglés) o, alternativamente, como una arquitectura de renderizado en el servidor (SSR), bajo la estricta observancia del paradigma de diseño priorizado para dispositivos móviles (Mobile-First). En virtud de las estimaciones que sugieren que la vasta mayoría de las interacciones se ejecutarán mediante terminales de telefonía móvil, es imperativo que la interfaz emule el comportamiento de una aplicación nativa, contemplando su ulterior evolución hacia una Aplicación Web Progresiva (PWA). La plataforma obrará, por ende, como el núcleo central para la gestión financiera del usuario final.

La demografía objetivo primordial abarca a individuos económicamente activos, profesionales independientes y núcleos familiares de constitución reciente, quienes presuntamente demandan alternativas de gestión provistas de automatización e interfaces visualmente congruentes, en contraposición a las herramientas provistas por las instituciones bancarias tradicionales, las cuales frecuentemente adolecen de rigidez estructural.

## **2\. Marco Tecnológico y Arquitectura Subyacente**

Para la consecución de los fines descritos, se ha determinado la adopción de un compendio tecnológico de vanguardia, caracterizado por su modularidad y orientación hacia el rendimiento óptimo. Esta aproximación arquitectónica facilitará la iteración expedita durante la fase del Producto Mínimo Viable (MVP), salvaguardando concurrentemente los preceptos de seguridad y asegurando la viabilidad de una escalabilidad ulterior:

* **Capa de Presentación (Frontend / UI):**  
  * **Entorno de Desarrollo:** Se empleará la biblioteca React.js, enriquecida mediante el marco de trabajo Next.js, con el propósito de capitalizar los beneficios del enrutamiento híbrido (renderizado en servidor para la optimización de motores de búsqueda e inicialización acelerada, en conjunción con el renderizado en el lado del cliente para garantizar la fluidez de las transiciones).  
  * **Estilización y Componentización:** Se estipula el uso de Tailwind CSS para la aplicación de estilos utilitarios estandarizados, complementado por la biblioteca Shadcn UI (fundamentada en Radix UI) para la implementación de componentes que cumplan con los más altos estándares de accesibilidad e interfaces adaptables.  
  * **Gestión del Estado:** Se integrará React Query (TanStack Query) a fin de administrar eficientemente el almacenamiento en caché de los datos provenientes del servidor, posibilitando mutaciones optimistas y la sincronización asíncrona, minimizando así la carga computacional sobre la base de datos.  
* **Infraestructura de Soporte (Backend as a Service) y Repositorio de Datos:**  
  * **Sistema Gestor de Base de Datos:** Se empleará PostgreSQL (proveído mediante la infraestructura de Supabase), haciendo uso exhaustivo de sus capacidades relacionales, vistas materializadas para la consolidación de informes complejos y disparadores (triggers) para la automatización a nivel de motor.  
  * **Sistema de Autenticación:** Se delega la verificación de identidades a Supabase Auth, contemplando el acceso mediante credenciales tradicionales y mecanismos de inicio de sesión único (SSO). Se proyecta la futura implementación de Autenticación Multifactor (MFA).  
  * **Protocolos de Seguridad:** Es mandatoria la implementación de políticas de Seguridad a Nivel de Fila (RLS) de carácter restrictivo directamente en la base de datos, garantizando matemáticamente la imposibilidad de que un identificador de usuario acceda a registros patrimoniales ajenos.  
  * **Cómputo Perimetral (Edge Functions):** Se prevé la ejecución de rutinas computacionales asíncronas de alta demanda (v.gr., recálculos de proyecciones patrimoniales) mediante el entorno Deno.  
  * **Almacenamiento de Archivos (Storage):** Se utilizarán repositorios de objetos (buckets) privados para la custodia encriptada de comprobantes fiscales y documentos probatorios de dominio.  
* **Despliegue y Entrega Continua (CI/CD):** La plataforma Vercel obrará como entorno de alojamiento, utilizándose sus facultades de despliegues preliminares para la validación continua del código fuente de manera previa a su integración definitiva.

## **3\. Especificación de Requisitos Funcionales (Módulos Troncales)**

### **3.1 Módulo de Autenticación e Incorporación de Usuarios (Onboarding)**

* **RF-1.1 Autenticación Omnicanal:** El sistema deberá proveer mecanismos para el registro y la autenticación mediante la conjunción de correo electrónico y contraseña (sujeto a validaciones criptográficas de entropía), así como la integración de protocolos OAuth para proveedores externos.  
* **RF-1.2 Flujo de Incorporación Interactivo:** Se requiere el diseño de un procedimiento secuencial inicial mediante el cual se configuren:  
  * La divisa fiduciaria principal sobre la cual se realizarán los cálculos.  
  * Los saldos iniciales correspondientes a los instrumentos financieros del usuario.  
  * La zona horaria, a efectos de garantizar la exactitud cronológica de los asientos contables.  
* **RF-1.3 Administración de la Privacidad:** Se deben incorporar mecanismos para la recuperación de credenciales, la exportación íntegra de la información personal (en cumplimiento con los marcos regulatorios de protección de datos aplicables) y la erradicación definitiva de la cuenta mediante un proceso de borrado lógico seguido de la depuración física de los registros.

### **3.2 Módulo de Flujo de Efectivo (Ingresos y Egresos)**

* **RF-2.1 Registro Transaccional Enriquecido:** Se debe facilitar la anotación de operaciones financieras, exigiendo la imputación del monto, la fecha exacta, la tipificación (categoría) y las cuentas afectadas. Se adicionará el soporte para:  
  * Anotaciones textuales y metaetiquetas para la facilitación de consultas cruzadas.  
  * Bifurcación de transacciones, permitiendo la asignación de fracciones de un mismo comprobante a múltiples rubros contables.  
* **RF-2.2 Automatización de Asientos Recurrentes:** El sistema procesará operaciones de periodicidad predefinida, insertando automáticamente las provisiones futuras en el flujo de caja proyectado y alterando su estado según su liquidación.  
* **RF-2.3 Visualización de la Tesorería:** La interfaz proveerá representaciones del flujo de caja mediante las siguientes modalidades:  
  * Listado cronológico de extensión indefinida.  
  * Representación en formato de calendario.  
  * Proyección de saldos futuros en función de las obligaciones programadas.  
* **RF-2.4 Taxonomía Contable:** Se implementará una estructura jerárquica para las categorías de ingresos y egresos, proveyéndose un catálogo sistémico predeterminado y facultando la creación de subdivisiones personalizadas.

### **3.3 Módulo de Planificación Presupuestaria**

* **RF-3.1 Configuración de Limites Presupuestarios:** Será posible el establecimiento de techos de gasto por periodos mensuales o anuales, dando soporte a la metodología contable de "Presupuesto Base Cero".  
* **RF-3.2 Conciliación Continua:** El algoritmo subyacente ejecutará el cruce inmediato de cada nuevo egreso registrado frente al límite presupuestario vigente para el periodo correspondiente.  
* **RF-3.3 Traspaso de Saldos (Rollover):** Se habilitará la opción para la transferencia de remanentes o déficits presupuestarios hacia el ejercicio del mes subsecuente.  
* **RF-3.4 Semiótica Visual del Gasto:** Se presentarán indicadores de progreso regidos por un esquema de semaforización semántica que advierta sobre el grado de consumo de los fondos asignados.

### **3.4 Módulo de Gestión del Acervo Patrimonial**

* **RF-4.1 Catastro de Activos:** Se requerirá la capacidad de registrar elementos patrimoniales clasificados según su índice de liquidez, comprendiendo disponibilidades bancarias, instrumentos de inversión y activos tangibles de carácter ilíquido (bienes raíces, automotores).  
* **RF-4.2 Consolidación de Pasivos:** Se dispondrá de interfaces para el registro de obligaciones contraídas con terceros, incluyendo préstamos prendarios, hipotecarios y líneas de crédito, requiriéndose la imputación de la tasa de interés efectiva aplicable.  
* **RF-4.3 Cuantificación del Patrimonio Neto:** El motor de cálculo computará de forma automatizada la diferencia entre la totalidad de los activos y los pasivos exigibles. Se generará un registro histórico inmutable al cierre de cada ciclo mensual para la posterior graficación de la trayectoria patrimonial.  
* **RF-4.4 Revaluación de Activos:** Se habilitarán procesos para la enmienda manual y periódica del valor de tasación de los bienes ilíquidos, preservando la traza de auditoría respecto a las fluctuaciones de valor.

### **3.5 Módulo de Alertas Sistémicas y Notificaciones**

* **RF-5.1 Lógica de Emisión de Alertas:** Se desarrollará un motor de eventos encargado de disparar notificaciones condicionales ante:  
  * La aproximación asintótica a los límites presupuestarios definidos.  
  * La proximidad del vencimiento de obligaciones o asientos recurrentes.  
  * La predicción de saldos negativos en el corto plazo, derivada del análisis del flujo de caja proyectado.

### **3.6 Módulo de Analítica de Datos y Tableros de Control**

* **RF-6.1 Tablero de Control Directivo:** Se confeccionará una interfaz de síntesis que exhiba la liquidez inmediata, el estado del ejercicio presupuestario y la estimación actualizada del patrimonio neto.  
* **RF-6.2 Desglose Analítico:** Se proveerán representaciones gráficas interactivas que desglosen la distribución del gasto conforme a la taxonomía contable establecida.  
* **RF-6.3 Análisis de Series Temporales:** Se generarán proyecciones gráficas que contrasten el flujo de ingresos frente a los egresos en periodos históricos predefinidos.  
* **RF-6.4 Extracción de Datos:** Se facilitarán herramientas para la filtración y exportación de la base de registros en formatos estandarizados, idóneos para la presentación ante autoridades fiscales o entidades de auditoría externa.

## **4\. Especificación de Requisitos No Funcionales**

* **Requisito No Funcional 1: Seguridad y Confidencialidad de la Información (Carácter Crítico):**  
  * La totalidad del tráfico de datos deberá ser encriptada mediante la aplicación del protocolo TLS 1.3/HTTPS.  
  * El aislamiento de la información quedará supeditado a la implementación estricta de políticas de Seguridad a Nivel de Fila (RLS) en la base de datos relacional.  
  * Se exigirá la sanitización rigurosa de todas las cadenas de texto ingresadas, mitigando la vulnerabilidad ante ataques de Inyección SQL y secuencias de comandos en sitios cruzados (XSS).  
* **Requisito No Funcional 2: Resiliencia y Comportamiento de la Interfaz:**  
  * Es menester la implementación de estructuras visuales de precarga (skeletons) orientadas a minimizar la percepción de latencia, acompañadas de confirmaciones visuales sutiles tras la ejecución de transacciones de estado.  
  * La interfaz deberá poseer la capacidad de transmutar entre esquemas de color de alta y baja luminosidad, en conformidad con los parámetros provistos por el sistema operativo subyacente.  
* **Requisito No Funcional 3: Parámetros de Rendimiento:**  
  * El tiempo transcurrido hasta el primer despliegue de contenido significativo (FCP) en el tablero principal no excederá los 1.5 segundos bajo condiciones de conectividad de red estándar.  
  * Las mutaciones del estado de la interfaz deberán regirse por el principio de actualización optimista, procediendo a la enmienda local previa a la recepción de la confirmación del servidor remoto.  
* **Requisito No Funcional 4: Accesibilidad Universal:**  
  * Se mandata el cumplimiento irrestricto de las directrices de accesibilidad delineadas en el estándar WCAG 2.1 nivel AA.  
* **Requisito No Funcional 5: Consideraciones de Escalabilidad:**  
  * La arquitectura del repositorio de datos debe obligatoriamente contemplar la estructuración de índices optimizados para garantizar tiempos de respuesta logarítmicos frente a consultas sobre conjuntos de datos de volumen sustancial acumulados a lo largo del tiempo.

## **5\. Diseño Estructural del Repositorio de Datos (Esquema Entidad-Relación)**

En lo concerniente a la esquematización de la base de datos, las entidades principales y sus interrelaciones se han estructurado conforme a los principios de normalización, eludiendo la redundancia sin detrimento de la eficiencia en los tiempos de lectura:

1. **users\_profiles**: Entidad subyacente que complementa los registros de autenticación; aloja metadatos de configuración (divisa fiduciaria, zona horaria).  
2. **accounts**: Entidad representativa de los instrumentos de captación y colocación de fondos.  
3. **categories**: Catálogo jerárquico para la clasificación del origen y destino de los fondos.  
4. **transactions**: Libro mayor del sistema; custodia el detalle minucioso de toda fluctuación pecuniaria, vinculada a las entidades users\_profiles, accounts y categories.  
5. **budgets**: Registro de las restricciones monetarias asignadas a periodos temporales específicos.  
6. **assets\_liabilities**: Catastro descriptivo de las propiedades de dominio y las obligaciones contractuales vigentes, sujeto a actualizaciones de valor de mercado.  
7. **net\_worth\_history**: Tabla de naturaleza analítica destinada al almacenamiento de las totalizaciones patrimoniales estáticas recabadas al cierre de cada ciclo.  
8. **alerts**: Registro de las notificaciones sistémicas emitidas y su estado de visualización.

## **6\. Planificación Estratégica y Fases de Despliegue**

Con el objeto de mitigar los riesgos inherentes al ciclo de desarrollo de software y propiciar la entrega temprana de valor, la ejecución del proyecto se someterá a un fraccionamiento por etapas:

* **Fase Preliminar (Producto Mínimo Viable):** Estará orientada a la validación de la adopción de los mecanismos de anotación manual y reconciliación presupuestaria. Conllevará la entrega de la arquitectura de datos, los flujos de autenticación y los módulos elementales de ingresos y egresos.  
* **Fase Intermedia (Inteligencia Patrimonial):** Tendrá como propósito la provisión de una perspectiva macroeconómica de las finanzas del individuo. Implicará el despliegue íntegro del módulo de gestión del acervo patrimonial, la computación de asimetrías históricas y la habilitación del motor de transacciones recurrentes.  
* **Fase Avanzada (Integración Perimetral):** Procurará la erradicación definitiva de las tareas de digitación manual mediante la vinculación con interfaces de programación de aplicaciones (APIs) provistas por el sector bancario, habilitando la conciliación y categorización de forma expedita y desatendida.