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
    along with chorMap.  If not, see <http://www.gnu.org/licenses/>.

*/

export default function (kibana) {
  return new kibana.Plugin({
    require: ['elasticsearch'],

    uiExports: {
      visTypes: ['plugins/choropleth_map/chorMap.js']
    }

  });
};
