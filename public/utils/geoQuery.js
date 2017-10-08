define(function (require){

	return function geoQueryFactory(Private){

		var new_query;
		var queryResult = {};
		var intervals = [];
		var colorLegendCustomizable = [];
		var constScroll = 500; //8000 only if you are using kibana in mod development. Change it to a lesser number with other kibana versions.
		const utils = Private(require('plugins/choropleth_map/utils/utils.js'));

		function getColor(d,normalized,how_show_data) {
            
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


		function QueryJSON(scope){

			this.queryKibana = '{\"index\":\".kibana\",\"type\":\"visualization\",\"body\":{\"query\":{\"match\":{\"title\":\"'+scope.$parent.vis.title+'\"}}}}';
			this.queryJsonIndexChosen = '{\"index\":\"' + scope.vis.indexPattern.title + '\",\"body\":{}}';
			this.queryJsonWorld = '{\"index\":\"'+scope.vis.params.index_chosen+'\",\"type\":\"' + scope.layerChosen + '\",\"scroll\":\"10s\",\"body\":{}}';
			this.queryGeoBound = '\"size\": 0,'+ 
						  '\"query\": {'+ 
						    '\"bool\": {'+ 
						     '\"must\":[],'+
							'\"must_not\":[],'+
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

			this.queryGeoShapeMS = '{\"body\":[]}';				  
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

		function createStringGeoShape(id,scope,filters_to_apply){

			var str_index = '{\"index\":\"'+scope.vis.indexPattern.title+'\"},';
			var str_query = '{\"query\":{\"bool\":{\"must\":[],\"must_not\":[],\"filter\":{\"geo_shape\": {\"'+scope.vis.params.geoShapeField+'\": {\"indexed_shape\": {\"id\": \"'+id+'\",\"type\": \"'+scope.layerChosen+'\",\"index\": \"'+scope.vis.params.index_chosen+'\",\"path\":\"shape_coordinates\"}}}}}}}';
			var obj_query = JSON.parse(str_query);
			
			obj_query.query.bool.must = filters_to_apply["positive"];
			obj_query.query.bool.must_not = filters_to_apply["negative"];
			str_query = JSON.stringify(obj_query);

			return str_index+str_query;
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

		function obtainFiltersShapeQuery(filters_to_apply,filters){ //filters is an array of objects
			console.log(filters);
			for(var i in filters){
				for(var key in filters[i]){
					if(key != "$$hashKey" && (key != "$state") && (key != "meta") && (key != "_proto_")){

						if(key == "query_string"){
							var new_obj = {};
							new_obj[key] = filters[i][key];
							filters_to_apply["positive"].push(new_obj);
						}
						else if(key == "query" && filters[i]["meta"]["disabled"] == false){
							if(filters[i]["meta"]["negate"]) //true
								filters_to_apply["negative"].push(filters[i][key]);
							else
								filters_to_apply["positive"].push(filters[i][key]);
						}
						else if(key != "query" && filters[i]["meta"]["disabled"] == false){
							var new_obj = {};
							new_obj[key] = filters[i][key];
							if(filters[i]["meta"]["negate"]) //true
								filters_to_apply["negative"].push(new_obj);
							else
								filters_to_apply["positive"].push(new_obj);

						}
					}
				}
			}
		};

		function applyGeoJson(scope,jsonData,leafletData,response,hits_ids){
			queryResult={};
			colorLegendCustomizable = [];

	        for(var i in response){
	        	queryResult[hits_ids[i]] = response[i].hits.total;
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

	        if(scope.how_show_data == "customizable")
	            for(var key in scope.colorLegend[norm][scope.how_show_data])
	            	colorLegendCustomizable.push(scope.colorLegend[norm][scope.how_show_data][key]);

	        scope["legend_"+scope.layerChosen] = {
                                                    colors: scope.colorLegend[norm][scope.how_show_data],
                                                    labels: scope.intervalsLegend[norm][scope.layerChosen][scope.how_show_data]
                                                  };
            

	        leafletData.getMap(scope.mapIDLayer[scope.vis.params.layer]).then(function (map) {
	               
						for(var key in map._layers){
						    var obj = map._layers[key];

						    if(obj.feature != undefined){

						    	var color = getColor(queryResult[obj.feature.properties.NAME],scope.vis.params.normalized,scope.how_show_data);
								
								//console.log(obj.feature.properties.NAME +" , "+color);

						    	obj.setStyle({
						            weight:1,
						            color:'#969696',
						            fillOpacity:1,
						            fillColor: getColor(queryResult[obj.feature.properties.NAME],scope.vis.params.normalized,scope.how_show_data)
						        });
						    }
						}

					});
	                	
	
		scope.doneQuery = true;
	    
	    setTimeout(function(){
	                leafletData.getMap(scope.mapIDLayer[scope.vis.params.layer]).then(function(map) {
	                console.log("RESIZE");
	                map.invalidateSize();
	                map._resetView(map.getCenter(), map.getZoom(), true);   
        		});
        },200);
        
	                
		};

		function queryHits(scope,client,jsonData,queryJson,hits_ids,leafletData,needFilters,filters){
			var string_to_insert='';
			var filters_to_apply = {
				"positive":[],
				"negative":[]
			}
			var how_many_query_done = 0;
			var index_pos = 0;
			var results = [];
			var took = 0;

			console.log("HITS_IDS.length: "+hits_ids.length);

			/*if you have two maps in a dashboard, for example one with 'countries' layer and the other one with 'italy_municipalities' layer,
			and you filter on a country different from Italy, the queryFilterAreaWorld's result will be 0. hits_ids.length == 0.*/
			if(hits_ids.length == 0){ 
				console.log("hits_ids.length: 0");
				applyGeoJson(scope,jsonData,leafletData,results,hits_ids);
				return;
			}
			
			obtainFiltersShapeQuery(filters_to_apply,filters);

			for(var i = 0; i<hits_ids.length && i<900;i++){
				if(i != (hits_ids.length -1) && i!=899)
					string_to_insert += createStringGeoShape(hits_ids[i],scope,filters_to_apply)+',';
				else
					string_to_insert += createStringGeoShape(hits_ids[i],scope,filters_to_apply);
			}

			if(i != hits_ids.length)
				index_pos = 900;

			var new_query_json = createQuery(queryJson.queryGeoShapeMS,string_to_insert,"]}");
			
			if(new_query_json == null){
				console.error("Error in creating GEO_SHAPE_QUERY");
				scope.errorField = true;
                scope.textError = "Error in creating GEO_SHAPE_QUERY";
				return;
			}

			new_query = JSON.parse(new_query_json);

			client.msearch(new_query,function executeAnotherQuery(error,response){
				if(error){
					console.error("Error in executing GEO_SHAPE_QUERY");
            		scope.errorField = true;
                	scope.textError = "Error in executing GEO_SHAPE_QUERY. Maybe you have to choose another index for geo_shape query." + error;
            		return;
				}else{
					
					console.log("QUERY HITS DONE");
					//console.log(response);
					how_many_query_done +=response.responses.length;
					//console.log("how_many_query_done: "+how_many_query_done);
					//console.log("hits_ids.length: "+hits_ids.length);

					for(var i in response.responses){
						took +=response.responses[i].took;
						console.log(response.responses[i].took);
					}

					results = results.concat(response.responses);
					//console.log(results);

					if(how_many_query_done < hits_ids.length){
						string_to_insert='';
						for(var i = index_pos; i<hits_ids.length && i<(index_pos +900);i++){

							if(i != (hits_ids.length -1) && i!=(index_pos+899))
								string_to_insert += createStringGeoShape(hits_ids[i],scope,filters_to_apply)+',';
							else
								string_to_insert += createStringGeoShape(hits_ids[i],scope,filters_to_apply);
						}
						
						if(i != hits_ids.length)
							index_pos += 900;
	
						new_query_json = createQuery(queryJson.queryGeoShapeMS,string_to_insert,"]}");

						if(new_query_json == null){
							console.error("Error in creating GEO_SHAPE_QUERY");
							scope.errorField = true;
			                scope.textError = "Error in creating GEO_SHAPE_QUERY";
							return;
						}

						new_query = JSON.parse(new_query_json);

						client.msearch(new_query,executeAnotherQuery);

					}
					else{
						console.log("ALL DONE");
						/*console.log(results);
						console.log(took);*/
						applyGeoJson(scope,jsonData,leafletData,results,hits_ids);
					}
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
	        console.log("FILTER AREA");
	        console.log(new_query);

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
					if (response.hits.total > allRecords.length) {
					    
						client.scroll({
							scrollId:response._scroll_id,
							scroll: '30s'
					    }, getMoreUntilDone);
					} else {
					   	console.log('all done', allRecords); //comment from the line 'if (response.hits.total > allRecords.length) {' to this line if you are using kibana in mod development.

		            	var hits_ids=[];

		            	for(var i = 0; i < allRecords.length; i++)
		            		hits_ids.push(allRecords[i]._id);

		            	//console.log(hits_ids);
		            	//console.log(hits_ids.length);

		            	queryHits(scope,client,jsonData,queryJson,hits_ids,leafletData,needFilters,filters);
	            	} //comment this line if you are using kibana in mod development.
	            }
        	});
		};

		function addFilters(objQuery,filters){ //filters is an array of objects
			console.log("ADDFILTERS");
			console.log(filters);
			for(var i in filters){
				for(var key in filters[i]){
					if(key != "$$hashKey" && (key != "$state") && (key != "meta") && (key != "_proto_")){
						
						if(key == "query_string"){
							var new_obj = {};
							new_obj[key] = filters[i][key];
							objQuery.body.query.bool.must.push(new_obj);
						}
						else if(key == "query" && filters[i]["meta"]["disabled"] == false){
							if(filters[i]["meta"]["negate"])
								objQuery.body.query.bool.must_not.push(filters[i][key]);
							else
								objQuery.body.query.bool.must.push(filters[i][key]);
							
						}
						else if(key != "query" && filters[i]["meta"]["disabled"] == false){
							var new_obj = {};
							new_obj[key] = filters[i][key];
							if(filters[i]["meta"]["negate"])
								objQuery.body.query.bool.must_not.push(new_obj);
							else
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
			new_query.body.query.bool.must_not = []; //clear filters.

			if(needFilters){
				console.log("NEED FILTERS MAKE QUERY.");
				addFilters(new_query,filters);

			}

			var top_left,bottom_right;
			console.log("GEO_BOUND_QUERY");
			console.log(new_query);

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

	                console.log("bottom_right: "+bottom_right);
	                console.log("top_left: "+top_left);

	                queryFilterAreaWorld(scope,client,jsonData,queryJson,bottom_right,top_left,leafletData,needFilters,filters);
	            }
        	});
		};

		function queryKibanaIndex(scope,client,filters_bar,filters_tot,filters_from_saved_vis){
			var queryJson = new QueryJSON(scope);
			new_query = JSON.parse(queryJson.queryKibana);

			client.search(new_query,function getMoreVisualization(error,response){
				if(error){
					console.error("Error executing QUERY ON KIBANA INDEX");
            		scope.errorField = true;
                	scope.textError = "Error in executing QUERY ON KIBANA INDEX. \n" + error;
            		return;
				}else{
					var hit = response.hits.hits[0];
					var objVisState,visState;
				
					visState = hit._source.visState;
					searchSourceJSON = hit._source.kibanaSavedObjectMeta.searchSourceJSON;
					objVisState = JSON.parse(visState);
				
					//console.log(hit._source.kibanaSavedObjectMeta.searchSourceJSON);
							
					objSearchSourceJSON = JSON.parse(searchSourceJSON);

					//for query_string
					if(JSON.stringify(objSearchSourceJSON.query) != "{\"match_all\":{}}"){
						filters_tot.push(objSearchSourceJSON.query);
						filters_from_saved_vis.push(objSearchSourceJSON.query);
					}
					
					if(objSearchSourceJSON.filter.length != 0)
						for(var key in objSearchSourceJSON.filter){
					        filters_bar.push(objSearchSourceJSON.filter[key]);
					        filters_tot.push(objSearchSourceJSON.filter[key]);
					        filters_from_saved_vis.push(objSearchSourceJSON.filter[key]);
					    }
				
					scope.vis.params.geoShapeField = objVisState.params.geoShapeField;
					scope.vis.params.geoPointField = objVisState.params.geoPointField;
				}
			});
		};
		

		return {
			makeQuery:makeQuery,
			queryKibanaIndex:queryKibanaIndex,
		}
	}
});

