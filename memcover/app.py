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
        table_name = 'morpho'  # clinic is the otherone
        table = init_table(table_name, 'schema')
        morpho_dselect = DynSelect('morpho_dselect', table, setop='AND')
        Front.instance().get_method('TableSrv.expose_table')(table)
        Front.instance().get_method('DynSelectSrv.expose_dselect')(morpho_dselect)

        xlsx_exporter.expose_methods()
        dist_vis.expose_methods()

        return {'main_table': table_name, 'main_selection': 'morpho_dselect'}


def main():
    app = App()
#    app.init()
    app.run()
