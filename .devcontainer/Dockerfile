FROM ubuntu:22.04

RUN apt-get update \
 && apt-get install -y \
      ca-certificates \
      curl \
      git \
      unzip

RUN curl -L "https://github.com/biomejs/biome/releases/download/cli%2Fv1.8.3/biome-linux-x64" -o biome \
  && chmod +x biome \
  && mv biome /usr/local/bin/biome
      
CMD [ "sleep", "infinity" ]