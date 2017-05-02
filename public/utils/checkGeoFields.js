/*	A KIBANA PLUGIN FOR CHOROPLETH MAPS
    Copyright (C) 2017  Margherita Gambini

   This file is part of choropleth_map.

    choropleth_map is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    choropleth_map is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with choropleth_map.  If not, see <http://www.gnu.org/licenses/>.

*/

//Check fields of type geo_shape and geo_point. The value of the geo_point field needs to be saved also in a geo_shape field of type Point.

define(function (require){

	return function checkFieldFactory(Private){

		function checkGeoFields(scope){
			scope.indexChosen = scope.vis.indexPattern.id;
			console.log(scope.vis.indexPattern);
			var found_shape_point=false;
			var found_point=false;
			var i;
			var fields = scope.vis.indexPattern.fields;

			for(i = 0; i < fields.length; i++){
				
				if(fields[i].$$spec.type == "geo_shape"){
					scope.vis.type.params.geoShapeFields.push(fields[i].$$spec.name);
					found_shape_point=true;
				}

				if(fields[i].$$spec.type == "geo_point"){
					scope.vis.type.params.geoPointFields.push(fields[i].$$spec.name);
					found_point=true;
				}

			}

			if(!found_shape_point || !found_point){
				scope.errorField = true;
				scope.textError = "couldn't find fields of type GEO_SHAPE and/or GEO_POINT in this index. You have to create a new Visualization and chose a different index.";
			}

		};

		function getAvailableIndices(scope,client){
			client.cat.indices({h:"index"},function(error,response){
				if(error == undefined){
					var indexes = response.split(/\n/);
					indexes.splice(indexes.length-1,1)
					scope.vis.type.params.indexes_available=indexes;
				}else{
					scope.errorField = true;
                    scope.textError = "THERE'S BEEN A PROBLEM FINDING OTHER INDEXES. TRY TO RELOAD.";
				}
			});
		};

		return{
			checkGeoFields:checkGeoFields,
			getAvailableIndices:getAvailableIndices
		}
	}
});
