/*  A KIBANA PLUGIN FOR CHOROPLETH MAPS
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

define(function (require){

	return function EventFunctionsFactory(Private){

		function getColor(d,normalized,how_show_data,intervals,colorLegendCustomizable) {

            if(how_show_data == "customizable"){
                var index_color = colorLegendCustomizable.length -1;
                var index = intervals.length;

                while(index > 0){

                  if(d >= intervals[index-2] && d < intervals[index-1])
                    return colorLegendCustomizable[index_color];

                  index_color--;
                  index = index -2;
                }

                return "white"; //if data doesn't belong to the intervals chosen by the user
            }

            if(d == "-Infinity")
                  return "white";

            if(normalized == "yes"){

                if(d == '-') //can't be normalized
                  return "white";

              return ((d > intervals[8]) && d <= intervals[9])? '#084081' :
                    d > intervals[7]? '#0868ac' :
                    d > intervals[6]? '#2b8cbe' :
                    d > intervals[5]? '#4eb3d3' :
                    d > intervals[4]? '#7bccc4' :
                    d > intervals[3]? '#a8ddb5' :
                    d > intervals[2]? '#ccebc5' :
                    d > intervals[1]? '#e0f3db' :
                                  '#f7fcf0';              
            }

            //NO NORMALIZED DATA

            return ((d > intervals[8]) && d <= intervals[9])? '#800026' :
                    d > intervals[7]? '#BD0026' :
                    d > intervals[6]? '#E31A1C' :
                    d > intervals[5]? '#FC4E2A' :
                    d > intervals[4]? '#FD8D3C' :
                    d > intervals[3]? '#FEB24C' :
                    d > intervals[2]? '#FED976' :
                    d > intervals[1]? '#FFEDA0' :
                                  '#FFFFCC';
        
    }; 
		
		function MouseOverEvent(scope,feature,leafletEvent){
			var layer = leafletEvent.target;
      			var queryResult = {};
			var norm = (scope.vis.params.normalized == "yes")?"norm":"notNorm";
			 if((scope.vis.params.geoShapeField.length == 0) || (scope.vis.params.geoPointField == 0))
       				 return;

      layer.setStyle({
				weight: 1,
				color:'#252525',
				fillColor: 'white'
			});


			scope.selected = feature.properties.NAME;

      queryResult = scope.map.getQueryResult(scope.layerChosen,norm,scope.how_show_data);
      scope.how_many = (queryResult[feature.properties.NAME] == "-")? 'can\'t be normalized' : (queryResult[feature.properties.NAME]);

		};

		function MouseOutEvent(scope,leafletPayload){
			scope.selected = '';
			scope.how_many = '';
			 if((scope.vis.params.geoShapeField.length == 0) || (scope.vis.params.geoPointField == 0))
        			return;
			
			if(leafletPayload.leafletEvent != undefined){

				var layer = leafletPayload.leafletEvent.target;
				var feature = leafletPayload.leafletObject.feature;
				var norm = (scope.vis.params.normalized == "yes")?"norm":"notNorm";
        var queryResult = {};

        queryResult = scope.map.getQueryResult(scope.layerChosen,norm,scope.how_show_data);

				layer.setStyle({
					weight: 1,
					color:'#969696',
          fillOpacity:1,
					fillColor: getColor(queryResult[feature.properties.NAME],scope.vis.params.normalized,scope.how_show_data,scope.map.getIntervals(scope.layerChosen,norm,scope.how_show_data),scope.colorLegend[norm][scope.how_show_data])
				});

			}
		};

		function changeStyle(scope,leafletData){
      leafletData.getMap(scope.mapIDLayer[scope.vis.params.layer]).then(function (map) {
          var norm = (scope.vis.params.normalized == "yes")?"norm":"notNorm";

          for(var key in map._layers){
            var obj = map._layers[key];
            if(obj.feature != undefined){

              var queryResult = {};
              queryResult = scope.map.getQueryResult(scope.layerChosen,norm,scope.how_show_data);

              obj.setStyle({
                weight:1,
                color:'#969696',
                fillOpacity:1,
                fillColor: getColor(queryResult[obj.feature.properties.NAME],scope.vis.params.normalized,scope.how_show_data,scope.map.getIntervals(scope.layerChosen,norm,scope.how_show_data),scope.colorLegend[norm][scope.how_show_data])
              });
            }
          }

      });
		};

    function ClickEvent(scope,leafletPayload,query,client,queryFilter,filters_from_saved_vis,filters_tot){

      if(leafletPayload.leafletEvent != undefined){
        scope.shapeClicked = leafletPayload.leafletObject.feature.properties.NAME;
        console.log("shapeClicked: "+scope.shapeClicked);

        var string_filter_new = '{\"meta\":{\"negate\":false,\"index\":\"'+scope.vis.indexPattern.title+'\"},\"query\":{\"bool\":{\"filter\":{\"geo_shape\": {\"'+scope.vis.params.geoShapeField+'\": {\"indexed_shape\": {\"id\": \"'+scope.shapeClicked+'\",\"type\": \"'+scope.layerChosen+'\",\"index\": \"'+scope.vis.params.index_chosen+'\",\"path\":\"shape_coordinates\"}}}}}}}';
        var filter_new = JSON.parse(string_filter_new);

        queryFilter.addFilters(filter_new);

      }
    };

		return {
			MouseOverEvent:MouseOverEvent,
			MouseOutEvent:MouseOutEvent,
			changeStyle:changeStyle,
      ClickEvent:ClickEvent
		}
	}
});
