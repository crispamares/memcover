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

Actualmente acepta exclisivamente los datos utilizados en este estudio
(*me refiero a este TFM*), pero en un futuro soportará que el usuario
sea capaz de cargar datos propios.

- diseño en tarjetas, ¿para qué?

- join de tablas

- cómo se exploran los datos

- basado en linked views

- dinámicas de la ontología de shneiderman, heer.

- gráficas incorporadas y para qué análisis valen

- soporte para NaN

- exportar tabla a xls

- tecnologías utilizadas

- windows y linux
