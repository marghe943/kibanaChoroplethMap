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

define(function (require) {
	return function MapFactory(Private){

		function Map(){
			this.jsonData = {};

			this.queryResult = {
				"norm":{
					"countries":{
						"linear":[],
						"logarithmic":[],
						"customizable":[]
					},
					"regions":{
						"linear":[],
						"logarithmic":[],
						"customizable":[]
					},
					"italy_provinces":{
						"linear":[],
						"logarithmic":[],
						"customizable":[]
					},
					"italy_municipalities":{
						"linear":[],
						"logarithmic":[],
						"customizable":[]
					}
				},
				"notNorm":{
					"countries":{
						"linear":[],
						"logarithmic":[],
						"customizable":[]
					},
					"regions":{
						"linear":[],
						"logarithmic":[],
						"customizable":[]
					},
					"italy_provinces":{
						"linear":[],
						"logarithmic":[],
						"customizable":[]
					},
					"italy_municipalities":{
						"linear":[],
						"logarithmic":[],
						"customizable":[]
					}
				}
			};

			this.intervals = {
				"norm":{
					"countries":{
						"linear":[],
						"logarithmic":[],
						"customizable":[]
					},
					"regions":{
						"linear":[],
						"logarithmic":[],
						"customizable":[]
					},
					"italy_provinces":{
						"linear":[],
						"logarithmic":[],
						"customizable":[]
					},
					"italy_municipalities":{
						"linear":[],
						"logarithmic":[],
						"customizable":[]
					}
				},
				"notNorm":{
					"countries":{
						"linear":[],
						"logarithmic":[],
						"customizable":[]
					},
					"regions":{
						"linear":[],
						"logarithmic":[],
						"customizable":[]
					},
					"italy_provinces":{
						"linear":[],
						"logarithmic":[],
						"customizable":[]
					},
					"italy_municipalities":{
						"linear":[],
						"logarithmic":[],
						"customizable":[]
					}
				}
			};

			this.maxValue = {
				"norm":{
					"countries":{
						"linear":[],
						"logarithmic":[]
					},
					"regions":{
						"linear":[],
						"logarithmic":[]
					},
					"italy_provinces":{
						"linear":[],
						"logarithmic":[]
					},
					"italy_municipalities":{
						"linear":[],
						"logarithmic":[]
					}
				},
				"notNorm":{
					"countries":{
						"linear":[],
						"logarithmic":[]
					},
					"regions":{
						"linear":[],
						"logarithmic":[]
					},
					"italy_provinces":{
						"linear":[],
						"logarithmic":[]
					},
					"italy_municipalities":{
						"linear":[],
						"logarithmic":[]
					}
				}
			};

			this.minValue = {
				"norm":{
					"countries":{
						"linear":[],
						"logarithmic":[]
					},
					"regions":{
						"linear":[],
						"logarithmic":[]
					},
					"italy_provinces":{
						"linear":[],
						"logarithmic":[]
					},
					"italy_municipalities":{
						"linear":[],
						"logarithmic":[]
					}
				},
				"notNorm":{
					"countries":{
						"linear":[],
						"logarithmic":[]
					},
					"regions":{
						"linear":[],
						"logarithmic":[]
					},
					"italy_provinces":{
						"linear":[],
						"logarithmic":[]
					},
					"italy_municipalities":{
						"linear":[],
						"logarithmic":[]
					}
				}
			};

		};

		Map.prototype.setJsonData = function (layerChosen,data){
				this.jsonData[layerChosen] = data;
			};

		Map.prototype.getJsonData = function (layerChosen){
				return this.jsonData[layerChosen];
			};

		Map.prototype.setQueryResult = function (layerChosen,normalized,how_show_data,value){
	    	this.queryResult[normalized][layerChosen][how_show_data] = value;
	    };

	    Map.prototype.getQueryResult = function (layerChosen,normalized,how_show_data){
	    	return this.queryResult[normalized][layerChosen][how_show_data];
	    };

	    Map.prototype.setIntervals = function (layerChosen,normalized,how_show_data,value){
	    	this.intervals[normalized][layerChosen][how_show_data] = value;
	    };

	    Map.prototype.getIntervals = function (layerChosen,normalized,how_show_data){
	    	return this.intervals[normalized][layerChosen][how_show_data];
	    };

	    Map.prototype.setMaxValue = function (layerChosen,normalized,how_show_data,value){
	    	this.maxValue[normalized][layerChosen][how_show_data] = value;
	    };

	    Map.prototype.getMaxValue = function (layerChosen,normalized,how_show_data){
	    	return this.maxValue[normalized][layerChosen][how_show_data];
	    };

	    Map.prototype.setMinValue = function (layerChosen,normalized,how_show_data,value){
	    	this.minValue[normalized][layerChosen][how_show_data] = value;
	    };

	    Map.prototype.getMinValue = function (layerChosen,normalized,how_show_data){
	    	return this.minValue[normalized][layerChosen][how_show_data];
	    };

		return Map;
	};
});
