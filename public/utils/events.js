/*  A KIBANA PLUGIN FOR CHOROPLETH MAPS
    Copyright (C) 2017  Margherita Gambini

   This file is part of chorMap.

    chorMap is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    chorMap is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with chorMap.  If not, see <http://www.gnu.org/licenses/>.

*/

define(function (require){

	return function EventFunctionsFactory(Private){

		function getColor(d,normalized,how_show_data,intervals,colorLegendCustomizable) {
            var plus_one = (how_show_data == "linear")? 0 : 1; //for data shown in the logarithmic way the intervals array has length 9 instead of 8.

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

              return ((d > intervals[7 + plus_one]) && d <= intervals[8 + plus_one])? '#084081' :
                    d > intervals[6 + plus_one]? '#0868ac' :
                    d > intervals[5 + plus_one]? '#2b8cbe' :
                    d > intervals[4 + plus_one]? '#4eb3d3' :
                    d > intervals[3 + plus_one]? '#7bccc4' :
                    d > intervals[2 + plus_one]? '#a8ddb5' :
                    d > intervals[1 + plus_one]? '#ccebc5' :
                    d > intervals[0 + plus_one]? '#e0f3db' :
                                  '#f7fcf0';              
            }

            //NO NORMALIZED DATA

            return ((d > intervals[7 + plus_one]) && d <= intervals[8 + plus_one])? '#800026' :
                    d > intervals[6 + plus_one]? '#BD0026' :
                    d > intervals[5 + plus_one]? '#E31A1C' :
                    d > intervals[4 + plus_one]? '#FC4E2A' :
                    d > intervals[3 + plus_one]? '#FD8D3C' :
                    d > intervals[2 + plus_one]? '#FEB24C' :
                    d > intervals[1 + plus_one]? '#FED976' :
                    d > intervals[0 + plus_one]? '#FFEDA0' :
                                  '#FFFFCC';
        
    }; 
		
		function MouseOverEvent(scope,feature,leafletEvent){
			var layer = leafletEvent.target;
      var queryResult = {};
			var norm = (scope.vis.params.normalized == "yes")?"norm":"notNorm";

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
			
			if(leafletPayload.leafletEvent != undefined){

				var layer = leafletPayload.leafletEvent.target;
				var feature = leafletPayload.leafletObject.feature;
				var norm = (scope.vis.params.normalized == "yes")?"norm":"notNorm";
        var queryResult = {};

        queryResult = scope.map.getQueryResult(scope.layerChosen,norm,scope.how_show_data);

				layer.setStyle({
					weight: 1,
					color:'#969696',
					fillColor: getColor(queryResult[feature.properties.NAME],scope.vis.params.normalized,scope.how_show_data,scope.map.getIntervals(scope.layerChosen,norm,scope.how_show_data),scope.colorLegend[norm][scope.how_show_data])
				});

			}
		};

    function AddLayerEvent(scope,leafletPayload){

      if(leafletPayload.leafletEvent != undefined){

        var layer = leafletPayload.leafletEvent.layer;
        var feature = leafletPayload.leafletEvent.layer.feature;
        if(feature != undefined){
          var norm = (scope.vis.params.normalized == "yes")?"norm":"notNorm";
          var queryResult = {};

          queryResult = scope.map.getQueryResult(scope.layerChosen,norm,scope.how_show_data);

          layer.setStyle({
            weight: 1,
            color:'#969696',
            fillColor: getColor(queryResult[feature.properties.NAME],scope.vis.params.normalized,scope.how_show_data,scope.map.getIntervals(scope.layerChosen,norm,scope.how_show_data),scope.colorLegend[norm][scope.how_show_data]) //
          });
        }
      }
    };

		function changeStyle(scope,leafletData){
      leafletData.getMap(scope.mapID).then(function (map) {
          var norm = (scope.vis.params.normalized == "yes")?"norm":"notNorm";

          for(var key in map._layers){
            var obj = map._layers[key];
            if(obj.feature != undefined){

              var queryResult = {};
              queryResult = scope.map.getQueryResult(scope.layerChosen,norm,scope.how_show_data);

              obj.setStyle({
                weight:1,
                color:'#969696',
                fillColor: getColor(queryResult[obj.feature.properties.NAME],scope.vis.params.normalized,scope.how_show_data,scope.map.getIntervals(scope.layerChosen,norm,scope.how_show_data),scope.colorLegend[norm][scope.how_show_data])
              });
            }
          }

      });
		};

    function ClickEvent(scope,leafletPayload,query,client,queryFilter){

      if(leafletPayload.leafletEvent != undefined){
        scope.shapeClicked = leafletPayload.leafletObject.feature.properties.NAME;
        console.log("shapeClicked: "+scope.shapeClicked);

        query.queryClickEvent(scope,client,queryFilter);

      }
    };

		return {
			MouseOverEvent:MouseOverEvent,
			MouseOutEvent:MouseOutEvent,
      AddLayerEvent:AddLayerEvent,
			changeStyle:changeStyle,
      ClickEvent:ClickEvent
		}
	}
});