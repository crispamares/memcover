## Memcover application

### Run the docker image

    # Run the image
    sudo docker run --rm --name="memcover" -p 8888:8888 -p 19000:19000 -p 19001:19001 -it jmorales/memcover


### Creating docker image

    # Build a new image
    sudo docker build -t "jmorales/memcover" . 
    # Save the image in a tar
	sudo docker save jmorales/memcover > dk.memcover.latest.tar
