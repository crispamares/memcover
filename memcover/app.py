from __init__ import ROOT
import os
from indyva.app import App as MetaApp
from data_adquisition import init_table
from indyva.facade.front import ContextFreeFront, Front
from indyva.facade.showcase import Showcase
from indyva.dynamics.dselect import DynSelect
import xlsx_exporter
import dist_vis
import describe_stats
import logbook
logbook.default_handler.level = logbook.DEBUG


default_data_path = os.path.join(os.path.dirname(ROOT), 'data')

argv_options = [
    ("data_dir", dict(default=default_data_path,
                      help="The directory where the user data is located"))
]


class App(MetaApp):
    def __init__(self):
        MetaApp.__init__(self, argv_options)

        ContextFreeFront.instance().add_method(self.init)
        ContextFreeFront.instance().add_method(self.clear_dselects)

    def init(self, dataset_name='joined'):
        '''
        This method loads the data in a table
        '''
        #morpho_table_name = "Histological features"
        #morpho_table = init_table(morpho_table_name, 'schema')
        #morpho_dselect = DynSelect('morpho_dselect', morpho_table, setop='AND')
        #Front.instance().get_method('TableSrv.expose_table')(morpho_table)
        #Front.instance().get_method('DynSelectSrv.expose_dselect')(morpho_dselect)

        #clinic_table_name = "Patients characteristics"
        #clinic_table = init_table(clinic_table_name, 'clinic_schema')
        #clinic_dselect = DynSelect('clinic_dselect', clinic_table, setop='AND')
        #Front.instance().get_method('TableSrv.expose_table')(clinic_table)
        #Front.instance().get_method('DynSelectSrv.expose_dselect')(clinic_dselect)

        joined_table_name = dataset_name
        joined_table = init_table(joined_table_name,
                                  self.config.data_dir,
                                  joined_table_name + '_schema')
        joined_dselect = DynSelect('joined_dselect', joined_table, setop='AND')
        Front.instance().get_method('TableSrv.expose_table')(joined_table)
        Front.instance().get_method('DynSelectSrv.expose_dselect')(joined_dselect)

        xlsx_exporter.expose_methods()
        dist_vis.expose_methods()
        describe_stats.expose_methods()

        return {
            #'morpho_table': morpho_table_name, 'morpho_selection': 'morpho_dselect',
            #'clinic_table': clinic_table_name, 'clinic_selection': 'clinic_dselect',
            'joined_table': joined_table_name, 'joined_selection': 'joined_dselect'}


    def clear_dselects(self):
            #dselect = Showcase.instance().get('morpho_dselect')
            #dselect.clear()
            #dselect = Showcase.instance().get('clinic_dselect')
            #dselect.clear()
            dselect = Showcase.instance().get('joined_dselect')
            dselect.clear()


def main():
    app = App()
#    app.init()
    app.run()
