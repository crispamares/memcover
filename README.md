## Memcover application

### Run the docker image

    # Run the image
    sudo docker run --rm --name="memcover" -p 8888:8888 -p 19000:19000 -p 19001:19001 -it jmorales/memcover


### Creating docker image

    # Build a new image
    sudo docker build -t "jmorales/memcover" . 
    # Save the image in a tar
	sudo docker save jmorales/memcover > dk.memcover.latest.tar

## Descripción ##

Trovi ("encontrar" en Esperanto), es una herramienta de análisis
exploratorio que permite analizar datos multidimensionales procedentes
de distinta fuentes.

Actualmente acepta exclusivamente los datos utilizados en este estudio
(*me refiero a este TFM*), pero en un futuro soportará que el usuario
sea capaz de cargar datos propios.

### Metáfora de diseño ###

El diseño de la interfaz está basado en la metáfora de las
tarjetas. Tenemos un tablero infinito donde poder desplegar todas las
tarjetas que quiera el usuario, situándolas y redimensionándolas como
quera. Hay dos tipos de tarjetas en este momento, pero la metáfora no
está limitada a ningún número en concreto.

El primer tipo de tarjetas son las visualizaciones. Todas estas
tarjetas comparten la misma finalidad, permitir "ver" al usuario una
representación determinada de los datos cargados en el sistema.

El segundo tipo de tarjetas son los filtros. Cada una de estas tarjetas
añade al tablero algún tipo de control para filtrar la información que
el resto de tarjetas son capaces de representar.

### Manejo de datos ###

Trovi es capaz de utilizar datos multidimensionales, los comúnmente
representados en forma de tabla, de múltiples fuentes. Para trabajar
con varias tablas a la vez éstas deben estar relacionadas entre sí, es
decir, deben compartir alguna columna de, por ejemplo, identificadores
de pacientes.

Si el usuario añade al tablero una visualización *"Data Table"* podrá
observar que todos sus datos se encuentran unidos en una misma
tabla. Esta operación es comúnmente conocida como *"inner join"* y
consigue unir dos o más tablas duplicando la información de la tabla
que menos filas tenga de manera que cada fila de la tabla resultante
tenga todas las columnas de las tablas originales que compartan
identificador.

Además, el sistema está preparado para trabajar con datos incompletos,
comúnmente llamados NA (*not assigned*) o NaN (*Not a number*).

Los datos del sistema, se pueden exportar en cualquier momento en
formato *.xls* que contendrá la tabla resultante de la unión de todas
las tablas cargadas. Además, las filas incluidas serán aquellas que
pasen todos los filtros que el usuario haya incluido en el tablero.

### Cómo se exploran los datos con Trovi ###

Trovi es una herramienta de análisis exploratorio de datos, y como tal
ofrece cierta libertad para que el usuario elija su ruta de
análisis. El objetivo de la herramienta es ser capaz de aumentar las
capacidades cognitivas del analista para entender los datos cargados.

Típicamente el usuario empieza una sesión de análisis creando alguna
tarjeta de visualización que aporte una visión de contexto. La gráfica
de *"Coordenadas Paralelas"* es ideal para este objetivo ya que
permite representar todas las filas de un número muy alto de
columnas. El número de dimensiones que soporta esta representación es
*a priori* ilimitado, pero en la práctica existen límites asociados a
la resolución de la pantalla. Comúnmente se considera que representar
más de 15 dimensiones simultáneamente daña la eficacia.

Sobre las *"Coordenadas Paralelas"* se han implementando algunas
posibilidades de interacción. La más utilizadas es el *brushing* en
las dimensiones cuantitativas. Cuando el usuario selecciona un rango
de valores, sólo serán mostradas las filas que tengan el valor de
dicha columna entre los valores mínimo y máximo del rango
establecido. Esto permite "interrogar" al conjunto de datos en base a
preguntas más o menos complejas como: "muéstrame los pacientes que
están dentro de este rango de edad y este rango de degeneración
cognitiva". La otra interacción soportada por este gráfico es la
capacidad de arrastrar los ejes con el fin de reordenarlos y revelar
posibles correlaciones, sólo visibles entre dimensiones contiguas.

Si se detectan evidencias de posibles correlaciones el siguiente paso
que daría el analista es contrastar dichas correlaciones creando una
tarjeta de visualización de *"Scatter Plot"*. Este tipo de gráfica es
el más indicado para identificar correlaciones entre dos variables
cuantitativas.

El analista utilizaría la tarjeta de *"Box Plot"* si lo que quiere
es comparar diferencias en la distribución de variables cuantitativas
según las diferentes categorías de otra variable categórica.

Estas son las visualizaciones incluidas en el momento de escribir este
texto, pero el diseño está pensado para ir añadiendo otras tarjetas
según los usuarios las vayan requiriendo.

Por ultimo, si el usuario desea ver al detalle sus datos, puede crear
una tarjeta de tipo *"Data Table"*.

Todos estas representaciones se ven afectadas por los filtros que el
usuario vaya incorporando al tablero. Estos filtros actúan como
*"visual queries"*, actualizando automáticamente los datos que se
muestran en el resto de tarjetas.

Esa capacidad para excluir a voluntad, repreguntar, ver rápidamente el
resultado de la pregunta y poder crear visualizaciones flexibles
ágilmente es lo que proporciona la verdadera potencia al análisis
exploratorio de datos. El principal objetivo de Trovi es capacitar al
usuario para realizar todas estas tareas de manera eficiente sin que
"pierda el hilo" de su razonamiento por culpa de la herramienta.

### Tecnologías utilizadas ###

Trovi es una herramienta de escritorio multiplataforma, se puede
instalar tanto en Windows como Linux. Está diseñado siguiendo una
arquitectura multiproceso.

El *backend* está escrito en *Python*, y utiliza *MongoDB* como base
de datos operacional. Todos estos procesos corren dentro de un
contenedor de *Docker* y en Windows a su vez en una máquina virtual
mínima.

El *frontend* está desarrollado con tecnologías web como *D3*, *React*
o *Bootstrap*, que se conectan por medio de *websockets* al
*backend*. Para que tenga las capacidades esperadas de una aplicación
de usuario todos los componentes web se integran dentro de
[electron](http://electron.atom.io/).



