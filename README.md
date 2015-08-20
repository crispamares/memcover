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
quera el usuario. Hay dos tipos de tarjetas en este momento, pero la
metáfora no está limitada a ningún número en concreto.

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
comúnmente llamados NaN (*Not a number*) o NA (*not assigned*).

Los datos del sistema, se pueden exportar en cualquier momento en
formato *.xls* que contendrá la tabla resultante de la unión de todas
las tablas cargadas. Además, las filas incluidas serán aquellas que
pasen todos los filtros que el usuario haya incluido en el tablero.

- cómo se exploran los datos

- basado en linked views

- dinámicas de la ontología de shneiderman, heer.

- gráficas incorporadas y para qué análisis valen

- tecnologías utilizadas

- windows y linux
