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

function CrisisMapProvider(Private) {
	var TemplateVisType = Private(require('ui/template_vis_type/template_vis_type'));

	// Describe our visualization
	return new TemplateVisType({
		name: 'choropleth_map', // The internal id of the visualization (must be unique)
		title: 'Choropleth Map', // The title of the visualization, shown to the user
		description: 'Choropleth Map Visualization. It only works if you have at least one geo_point field '+
					'and the relative geo_shape field of type point in your index (see read.md). '+
					'When you choose the index to visualize you have to wait about 30s - 60s before '+
					'you see the visualization panel, for some geojson shapes need to be uploaded.', // The description of this vis
		icon: 'fa-map', // The font awesome icon of this visualization
		template: require('plugins/choropleth_map/chorMap.html'), // The template, that will be rendered for this visualization
		// Define the aggregation your visualization accepts
		params:{
			defaults:{
				 index_chosen: '',
				 layer: 'countries',
				 geoShapeField: '',
				 geoPointField: '',
				 normalized:'yes',
				 how_show_data: 'linear',
				 rangeChanges: '-',
				 ranges:[{from:0,to:1000,color:"#FFFFCC"},{from:1000,to:2000,color:"#FFEDA0"},{from:8000,to:10000,color:"#FED976"},{from:15000,to:18000,color:"#FEB24C"},{from:25000,to:28000,color:"#FD8D3C"}]
			},
			indexes_available:[],
			layers:['countries','regions','italy_provinces','italy_municipalities'],
			geoShapeFields:[],
			geoPointFields:[],
			normalizedFields:['yes','no'],
			how_show_data:['linear','logarithmic','customizable'],
			editor: require('plugins/choropleth_map/options.html')
		}
	});
}

require('ui/registry/vis_types').register(CrisisMapProvider);
require('plugins/choropleth_map/chorMapController');
require('plugins/choropleth_map/chorMap.less');

