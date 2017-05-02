#!/bin/bash

#LICENSE
#	A KIBANA PLUGIN FOR CHOROPLETH MAPS
#    Copyright (C) 2017  Margherita Gambini

#   This file is part of chorMap.

#   chorMap is free software: you can redistribute it and/or modify
#    it under the terms of the GNU General Public License as published by
#    the Free Software Foundation, either version 3 of the License, or
#    (at your option) any later version.

#    chorMap is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU General Public License for more details.

#    You should have received a copy of the GNU General Public License
#    along with chorMap.  If not, see <http://www.gnu.org/licenses/>.
# ********************************************************************

#you can edit $HOST and/or $PORT to suit them to your environment.
HOST="localhost"
PORT="9200"

#you can change the index name. This index will contain all countries, regions, italy-provinces and italy-municipalities border shapes
INDEX_NAME="world"

#to check the dependencies of elasticdump
VALID_NODE=$(which node)
VALID_NPM=$(which npm)
VALID_ESDUMP=$(which elasticdump)

#GPL V3 LICENSE
printf "chorMap Copyright (C) 2017  MargheritaGambini\n"
printf "This program comes with ABSOLUTELY NO WARRANTY.\n"
printf "This is free software, and you are welcome to redistribute it\n"
printf "under certain conditions.\n"

if [ ! -z "$VALID_NODE" ]; then

	if [ ! -z "$VALID_NPM" ]; then

		if [ ! -z "$VALID_ESDUMP" ]; then
			
			#creates the 'node_modules' folder and installs the dependencies in it
			npm install

			#add a line to the file 'angular-leaflet-directive.js' to solve the problem for which you couldn't change dynamically the leaflet map's id
			#now you can use kibana's dashboard with more then one chorMap plugin.
			sed -i.bu $'129i\\\nelement[0].id = attrs.id;\n' ./node_modules/angular-leaflet-directive/dist/angular-leaflet-directive.js
			rm ./node_modules/angular-leaflet-directive/dist/angular-leaflet-directive.js.bu

			printf "\nMapping...\n"
			elasticdump --input=./elasticsearchData/mapping.json --output=http://$HOST:$PORT/$INDEX_NAME --type=mapping
			printf "\nes_countries...\n"
			elasticdump --input=./elasticsearchData/es_countries.json --output=http://$HOST:$PORT/$INDEX_NAME --type=data
			printf "\nes_regions...\n"
			elasticdump --input=./elasticsearchData/es_regions.json --output=http://$HOST:$PORT/$INDEX_NAME --type=data
			printf "\nes_italy_provinces...\n"
			elasticdump --input=./elasticsearchData/es_italy_provinces.json --output=http://$HOST:$PORT/$INDEX_NAME --type=data
			printf "\nes_italy_municipalities...\n"
			elasticdump --input=./elasticsearchData/es_italy_municipalities.json --output=http://$HOST:$PORT/$INDEX_NAME --type=data
			
			printf "\ncreating conf.js file...\n"
			printf "window.host = \"$HOST\";\n" > conf.js
			printf "window.port = \"$PORT\";\n" >> conf.js
		else
			echo "elasticdump not installed. Install elasticdump and retry."
		fi
		
	else
		echo "npm not installed. Install npm and retry."
	fi

else
	echo "node not installed. Install node and retry."
fi


