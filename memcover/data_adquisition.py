# -*- coding: utf-8 -*-
'''
Created on 13/12/2013

@author: jmorales
'''

import os

from indyva.IO.table_io import read_csv


def init_table(dataset, data_path, schema_desc=None):

    filepath = os.path.join(data_path, dataset + '.csv')

    schema = None
    if schema_desc:
        schema = os.path.join(data_path, schema_desc + '.json')

    table = read_csv(table_name=dataset, filepath=filepath, schema=schema, skipinitialspace=True)
    return table


if __name__ == '__main__':
    table = init_table("clinic")
    print table.schema
