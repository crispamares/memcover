# -*- coding: utf-8 -*-
'''
Created on 8/09/2015

@author: jmorales
'''

from indyva.facade.front import Front
from indyva.facade.showcase import Showcase
import pandas as pd


def describe_stats(dselect_name, dataset_name, attr_name):
    dselect = Showcase.instance().get(dselect_name)
    dataset = Showcase.instance().get(dataset_name)
    description = None

    project = {attr_name: True}
    query = dselect.query if dselect.get_conditions() else {}

    data = dataset.find(query, project).get_data('c_list')

    attr_scheme = dataset.schema.attributes[attr_name]
    if data and attr_scheme.attribute_type == "QUANTITATIVE":
        desc = [d if pd.np.isreal(d) else None for d in data[attr_name]]
        description = pd.Series(desc).describe().to_dict()

    return description


def expose_methods():
    Front.instance().add_method(describe_stats)
