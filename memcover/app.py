from indyva.app import App as MetaApp
from data_adquisition import init_table
from indyva.facade.front import ContextFreeFront, Front
from indyva.dynamics.dselect import DynSelect
import xlsx_exporter
import dist_vis
import logbook
logbook.default_handler.level = logbook.DEBUG


class App(MetaApp):
    def __init__(self):
        MetaApp.__init__(self)

        ContextFreeFront.instance().add_method(self.init)

    def init(self):
        '''
        This method loads the data in a table
        '''
        morpho_table_name = 'morpho'
        morpho_table = init_table(morpho_table_name, 'schema')
        morpho_dselect = DynSelect('morpho_dselect', morpho_table, setop='AND')
        Front.instance().get_method('TableSrv.expose_table')(morpho_table)
        Front.instance().get_method('DynSelectSrv.expose_dselect')(morpho_dselect)

        clinic_table_name = 'clinic'
        clinic_table = init_table(clinic_table_name, 'clinic_schema')
        clinic_dselect = DynSelect('clinic_dselect', clinic_table, setop='AND')
        Front.instance().get_method('TableSrv.expose_table')(clinic_table)
        Front.instance().get_method('DynSelectSrv.expose_dselect')(clinic_dselect)

        joined_table_name = 'joined'
        joined_table = init_table(joined_table_name, 'joined_schema')
        joined_dselect = DynSelect('joined_dselect', joined_table, setop='AND')
        Front.instance().get_method('TableSrv.expose_table')(joined_table)
        Front.instance().get_method('DynSelectSrv.expose_dselect')(joined_dselect)

        xlsx_exporter.expose_methods()
        dist_vis.expose_methods()

        return {
            'morpho_table': morpho_table_name, 'morpho_selection': 'morpho_dselect',
            'clinic_table': clinic_table_name, 'clinic_selection': 'clinic_dselect',
            'joined_table': joined_table_name, 'joined_selection': 'joined_dselect'}


def main():
    app = App()
#    app.init()
    app.run()
