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

define(function (require){

	return function geoQueryFactory(Private){

		var new_query;
		var queryResult = {};
		var intervals = [];
		var colorLegendCustomizable = [];
		var constScroll = 8000; //8000 only if you are using kibana in mod development. Change it to a lesser number with other kibana versions.
		var constFixCoordinates = 5; //if in the function queryClickEvent(...) the resulting geo_bounding_box has top_left_lat == bottom_right_lat and/or
									// top_left_lon == bottom_right_lon then we have to fix the coordinates to create a real box. We do this by
									// incrementing the longitude and/or decrementing the latitude of the point bottom_right. We use Math.pow(10,constFixCoordinates)
									//and Math.ceil, Math.floor as explained in function below fixCoordinates(coordinates)
		const utils = Private(require('plugins/choropleth_map/utils/utils.js'));

		function getColor(d,normalized,how_show_data) {

			
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


        /*I couldn't find a way to pass more parameters to "style" function other than feature, 
        so I have to include it in geoQuery.js and event.js files together with getColor function.*/
		function style(feature) {
			var normalized = queryResult['normalized'];
			var how_show_data = queryResult['how_show_data'];
			console.log("STYLE");
			
            return {
                fillColor: getColor(queryResult[feature.properties.NAME],normalized,how_show_data),
                weight: 1,
                opacity: 1,
                color: '#969696',
                fillOpacity: 1
            };
        };	

		function QueryJSON(scope){

			this.queryKibana = '{\"index\":\".kibana\",\"type\":\"visualization\",\"body\":{\"query\":{\"match_all\":{}}}}';
			this.queryJsonIndexChosen = '{\"index\":\"' + scope.vis.indexPattern.id + '\",\"body\":{}}';
			this.queryJsonWorld = '{\"index\":\"'+scope.vis.params.index_chosen+'\",\"type\":\"' + scope.layerChosen + '\",\"scroll\":\"10s\",\"body\":{}}';
			this.queryGeoShape = '{\"index\":\"' + scope.vis.indexPattern.id + '\",\"body\":{\"size\":0,\"query\":{\"bool\":{\"must\":[]}},\"aggs\":{\"filter_agg\":{\"filters\":{\"filters\":{}}}}}}';
			this.queryGeoBound = '\"size\": 0,'+ 
						  '\"query\": {'+ 
						    '\"bool\": {'+ 
						     '\"must\":[],'+
						      '\"filter\": {'+ 
						        '\"geo_bounding_box\": {'+ 
						          '\"'+scope.vis.params.geoPointField+'\": {'+ 
						            '\"top_left\": {'+ 
						              '\"lat\": 89.9,'+ 
						              '\"lon\": -179.9'+ 
						            '},'+ 
						            '\"bottom_right\": {'+ 
						              '\"lat\": -89.9,'+ 
						              '\"lon\": 179.9'+ 
						            '}'+ 
						          '}'+ 
						        '}'+ 
						      '}'+ 
						    '}'+ 
						  '},'+ 
						  '\"aggs\": {'+
						    '\"bounds_data\": {'+
						      '\"geo_bounds\": {'+
						        '\"field\": \"'+scope.vis.params.geoPointField+'\",'+
						        '\"wrap_longitude\": true'+
						      '}'+
						    '}'+
						  '}';

			this.queryGeoShapeFilterWorld = '\"size\": '+constScroll+','+ //GESTIRE SIZE CON SCROLL...
									'\"query\": {'+
								    '\"bool\": {'+
								      '\"filter\": {'+
								        '\"geo_shape\": {'+
								          '\"shape_coordinates\": {'+
								            '\"shape\": {'+
								              '\"type\": \"envelope\",'+
								              '\"coordinates\": ['+
								                '['+
								                '],'+
								                '['+
								                ']'+
								              ']'+
								            '},'+
								            '\"relation\": \"intersects\"'+
								          '}'+
								        '}'+
								      '}'+
								    '}'+
								  '}';

			this.queryClickShape = '{\"index\":\"'+scope.vis.indexPattern.id+'\",'+
										'\"body\":{'+
											'\"size\": 0,'+ 
											'\"query\":{'+
												'\"bool\": {'+
											      '\"filter\": {'+
											        '\"geo_shape\": {'+
											          '\"'+scope.vis.params.geoShapeField+'\": {'+
											            '\"indexed_shape\": {'+
												              '\"id\": \"'+scope.shapeClicked+'\",'+
												              '\"type\": \"'+scope.layerChosen+'\",'+
												              '\"index\": \"'+scope.vis.params.index_chosen+'\",'+
												              '\"path\":\"shape_coordinates\"'+
														'},'+
											            '\"relation\": \"intersects\"'+
											          '}'+
											        '}'+
											      '}'+
											    '}'+
											'},'+
											'\"aggs\": {'+
											    '\"bound\": {'+
											      '\"geo_bounds\": {'+
											        '\"field\": \"'+scope.vis.params.geoPointField+'\",'+
											        '\"wrap_longitude\": true'+
											      '}'+
											    '}'+
											'}'+
										'}'+
									'}';					  
		}

		function createQuery(queryJson,string_to_insert,regexp){
			
			var reg_exp = new RegExp(regexp,"g");
			var match = reg_exp.exec(queryJson);
		    if (match) {
		        var output = [queryJson.slice(0, match.index), string_to_insert, queryJson.slice(match.index)].join('');

			    return output;
		    }else{
		        return null;
		    }
		};

		function createStringGeoShape(id,scope){
			var str = '\"'+id+'\"'+':{\"geo_shape\": {\"'+scope.vis.params.geoShapeField+'\": {\"indexed_shape\": {\"id\": \"'+id+'\",\"type\": \"'+scope.layerChosen+'\",\"index\": \"'+scope.vis.params.index_chosen+'\",\"path\":\"shape_coordinates\"}}}}';
			return str;
		};

		function insertEnvelope(query_to_edit,regexp,string_to_insert){
			var reg_exp = new RegExp(regexp,"g");
			var match = reg_exp.exec(query_to_edit);
			if (match) {
	            var output = [query_to_edit.slice(0, match.index), string_to_insert, query_to_edit.slice(match.index)].join('');

		        return output;
	        }else
	        	return null;
		};

		function applyGeoJson(scope,jsonData,leafletData,response){
			queryResult={};
			colorLegendCustomizable = [];

	        for(var item_bucket in response.aggregations.filter_agg.buckets){
	            var obj = response.aggregations.filter_agg.buckets[item_bucket];
	            for(var prop in obj){
	            	queryResult[item_bucket] = obj[prop];
	            }
	        }

	        var norm = (scope.vis.params.normalized == "yes")?"norm":"notNorm";

	        scope.map.setJsonData(scope.layerChosen,jsonData);

	        //calculate normalized - non normalized values (both linear and logarithmic) and intervals for legend map 
	        utils.calculateQueryValues(scope,queryResult,jsonData,true);
	       	utils.calculateQueryValues(scope,queryResult,jsonData,false);

	        utils.calculateIntervalLegend(scope,false);
	        utils.calculateIntervalLegend(scope,true);

	        intervals = scope.map.getIntervals(scope.layerChosen,norm,scope.how_show_data);
	        queryResult = scope.map.getQueryResult(scope.layerChosen,norm,scope.how_show_data);
	            	
	        queryResult['normalized'] = scope.vis.params.normalized;
	        queryResult['how_show_data'] = scope.how_show_data;

	        if(scope.how_show_data == "customizable")
	            for(var key in scope.colorLegend[norm][scope.how_show_data])
	            	colorLegendCustomizable.push(scope.colorLegend[norm][scope.how_show_data][key]);

	        angular.extend(scope,{
	            legend:{
                    colors: scope.colorLegend[norm][scope.how_show_data],
                    labels: scope.intervalsLegend[norm][scope.layerChosen][scope.how_show_data]
                }
	        });

	        if(scope.geojson != undefined){

	            if(scope.geojson.data == jsonData){
	               	console.log("scope.geojson.data == jsonData");

	                leafletData.getMap(scope.mapID).then(function (map) {

						for(var key in map._layers){
						    var obj = map._layers[key];
						    if(obj.feature != undefined){

						    	var color = getColor(queryResult[obj.feature.properties.NAME],scope.vis.params.normalized,scope.how_show_data);
								
								console.log(obj.feature.properties.NAME +" , "+color);

						    	obj.setStyle({
						            weight:1,
						            color:'#969696',
						            fillColor: getColor(queryResult[obj.feature.properties.NAME],scope.vis.params.normalized,scope.how_show_data)
						        });
						    }
						}

					});
	                	
	                return;	
	            }
	        }

		    angular.extend(scope, {
	            geojson: {
		            data: jsonData,
		            style: style
	            }
	        });
	                
		};

		function queryHits(scope,client,jsonData,queryJson,hits_ids,leafletData,needFilters,filters){
			var string_to_insert='';

			for(var i = 0; i<hits_ids.length;i++){
				if(i == 0)
					string_to_insert += createStringGeoShape(hits_ids[i],scope);
				else 
					string_to_insert += ',' + createStringGeoShape(hits_ids[i],scope);
			}
	
			var new_query_json = createQuery(queryJson.queryGeoShape,string_to_insert,"[}]{6}$");
			
			if(new_query_json == null){
				console.error("Error in creating GEO_SHAPE_QUERY");
				scope.errorField = true;
                scope.textError = "Error in creating GEO_SHAPE_QUERY";
				return;
			}

			new_query = JSON.parse(new_query_json);
			new_query.body.query.bool.must = []; //clear filters.

			if(needFilters){
				console.log("NEED FILTERS HITS QUERY.");
				addFilters(new_query,filters);

			}

			client.search(new_query, function (error, response) {
            	if(error){
            		console.error("Error in executing GEO_SHAPE_QUERY");
            		scope.errorField = true;
                	scope.textError = "Error in executing GEO_SHAPE_QUERY. Maybe you have to choose another index for geo_shape query." + error;
            		return;
            	}
	            else{
	            	applyGeoJson(scope,jsonData,leafletData,response);
	            }
        	});	
		};


		function queryFilterAreaWorld(scope,client,jsonData,queryJson,bottom_right,top_left,leafletData,needFilters,filters){
			var allRecords = [];
			var new_query_json = createQuery(queryJson.queryJsonWorld,queryJson.queryGeoShapeFilterWorld,"[}]{2}$");

			/*this query result is a list of ids of the geo_shapes (belonging to the "WORLD" index) which intersect the bounding box
			found with the previous query. In this way you could use less geo_shapes during the next query (queryHits(...)).
			For example, with regions layer: data are only limited to Tuscany and Lazio, so with the first query (geo_bounding_box) you obtain a bounding
			box containing only that two regions. Therefore the results of geo_filter_area are only the ids of Tuscan and Lazio and with 
			query_hit you make a query upon only two geo_shapes instead upon 3000+ geo_shapes (you save lots of time!)*/

			if(new_query_json == null){
				console.error("Error in creating GEO_FILTER_AREA");
				scope.errorField = true;
                scope.textError = "Error in creating GEO_FILTER_AREA.";
				return;
			}

	        new_query_json = insertEnvelope(new_query_json,"],",top_left);
	        new_query_json = insertEnvelope(new_query_json,"]]",bottom_right);

	        new_query = JSON.parse(new_query_json);

	        client.search(new_query, function getMoreUntilDone(error, response) {
            	if(error){
            		console.error("Error executing GEO_FILTER_AREA");
            		scope.errorField = true;
                	scope.textError = "Error in executing GEO_FILTER_AREA. Maybe you have to choose another index for geo_shape query." + error;
            		return;
            	}
	            else{

	            	//collect all the records
	            	response.hits.hits.forEach(function (hit) {
						allRecords.push(hit);
					});

	            	console.log('response.hits.total: '+response.hits.total);
	            	console.log('allRecords length: '+allRecords.length);
					/*if (response.hits.total > allRecords.length) { //uncomment this line if you are not using kibana in mod development.
					    
						client.scroll({
							scroll: '10s',
							body: response._scroll_id
					    }, getMoreUntilDone);
					} else {
					   	console.log('all done', allRecords);*/ //uncomment this line if you are not using kibana in mod development.

		            	var hits_ids=[];

		            	for(var i = 0; i < allRecords.length; i++)
		            		hits_ids.push(allRecords[i]._id);

		            	//console.log(hits_ids);
		            	//console.log(hits_ids.length);

		            	queryHits(scope,client,jsonData,queryJson,hits_ids,leafletData,needFilters,filters);
	            	//} //uncomment this line if you are not using kibana in mod development.
	            }
        	});
		};

		function addFilters(objQuery,filters){ //filters is an array of objects
			console.log(filters);
			for(var i in filters){
				for(var key in filters[i]){
					if(key != "$$hashKey" && (key != "$state") && (key != "meta") && (key != "_proto_")){
						console.log(filters[i][key]);
						if(key == "query")
							objQuery.body.query.bool.must.push(filters[i][key]);
						else{
							var new_obj = {};
							new_obj[key] = filters[i][key];
							objQuery.body.query.bool.must.push(new_obj);

						}
					}
				}
			}
		};


		function makeQuery(client,scope,jsonData,leafletData,needFilters,filters){
			
			var queryJson = new QueryJSON(scope);

			var new_query_json = createQuery(queryJson.queryJsonIndexChosen,queryJson.queryGeoBound,"[}]{2}$");
			/*this query's result is the bounding box containing all data of the index chosen by the user.*/
			
			if(new_query_json == null){
				console.error("Error in creating GEO_BOUND_QUERY");
				scope.errorField = true;
                scope.textError = "Error in creating GEO_BOUND_QUERY.";
				return;
			}

			new_query = JSON.parse(new_query_json);
			new_query.body.query.bool.must = []; //clear filters.

			if(needFilters){
				console.log("NEED FILTERS MAKE QUERY.");
				addFilters(new_query,filters);

			}

			var top_left,bottom_right;

			client.search(new_query, function (error, response) {
            	if(error){
            		console.error("Error executing GEO_BOUND_QUERY");
            		scope.errorField = true;
                	scope.textError = "Error in executing GEO_BOUND_QUERY. \n" + error;
            		return;
            	}
	            else{

	            	if(response.aggregations.bounds_data.bounds == undefined){
	            		scope.errorField = true;
                		scope.textError = "No results displayed because all values equal 0.";
                		return;
	            	}

	                bottom_right = response.aggregations.bounds_data.bounds.bottom_right.lon + ',' + response.aggregations.bounds_data.bounds.bottom_right.lat;
	                top_left = response.aggregations.bounds_data.bounds.top_left.lon + ',' + response.aggregations.bounds_data.bounds.top_left.lat;

	                queryFilterAreaWorld(scope,client,jsonData,queryJson,bottom_right,top_left,leafletData,needFilters,filters);
	            }
        	});
		};

		function queryKibanaIndex(scope,client){
			var queryJson = new QueryJSON(scope);
			new_query = JSON.parse(queryJson.queryKibana);

			client.search(new_query,function(error,response){
				if(error){
					console.error("Error executing QUERY ON KIBANA INDEX");
            		scope.errorField = true;
                	scope.textError = "Error in executing QUERY ON KIBANA INDEX. \n" + error;
            		return;
				}else{
					//console.log("response kibana");
					var hits_array = response.hits.hits;
					var objVisState,visState;
					for(var key in hits_array){
						visState = hits_array[key]._source.visState;
						objVisState = JSON.parse(visState);
						if(objVisState.title == scope.$parent.vis.title){
							scope.vis.params.geoShapeField = objVisState.params.geoShapeField;
							scope.vis.params.geoPointField = objVisState.params.geoPointField;
						}
					}
				}
			});
		};

		function fixCoordinates(coordinates){
			if(coordinates["latitude_left"] == coordinates["latitude_right"]){
				coordinates["latitude_right"] = Math.pow(10,-constFixCoordinates) * (Math.floor(coordinates["latitude_right"]*Math.pow(10,constFixCoordinates)));

				if(coordinates["longitude_left"] == coordinates["longitude_right"])
					coordinates["longitude_right"] = Math.pow(10,-constFixCoordinates) * (Math.ceil(coordinates["longitude_right"]*Math.pow(10,constFixCoordinates)));
			}
		}

		function queryClickEvent(scope,client,queryFilter){
			var queryJson = new QueryJSON(scope);
			new_query = JSON.parse(queryJson.queryClickShape);
			var coordinates = {};

			client.search(new_query,function(error,response){
				if(error){
					console.error("Error executing QUERY_CLICK_EVENT");
            		scope.errorField = true;
                	scope.textError = "Error in executing QUERY_CLICK_EVENT. \n" + error;
            		return;
				}else{
					console.log("queryClickEvent");
					console.log(response);

					if(response.aggregations.bound.bounds == undefined){
	            		console.log("NO POINTS IN THIS geo_bounding_box");
                		return;
	            	}

					coordinates["latitude_left"] = response.aggregations.bound.bounds.top_left.lat;
					coordinates["longitude_left"] = response.aggregations.bound.bounds.top_left.lon;
					coordinates["latitude_right"] = response.aggregations.bound.bounds.bottom_right.lat;
					coordinates["longitude_right"] = response.aggregations.bound.bounds.bottom_right.lon;

					//create geo bounding filter
			        var filter;

			        filter = {
			          meta: {
			            negate: false,
			            index: scope.vis.indexPattern.id
			          },
			          geo_bounding_box:{}

			        };

			        fixCoordinates(coordinates);
			        console.log("coordinates");
					console.log(coordinates);

			        filter.geo_bounding_box[scope.vis.params.geoPointField] = {
			          top_left: {lat: coordinates["latitude_left"], lon: coordinates["longitude_left"]},
			          bottom_right:{lat: coordinates["latitude_right"], lon: coordinates["longitude_right"]}
			        };

			        queryFilter.addFilters(filter);
				}
			});

		};
		

		return {
			makeQuery:makeQuery,
			queryKibanaIndex:queryKibanaIndex,
			queryClickEvent:queryClickEvent
		}
	}
});

