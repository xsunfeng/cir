class DBRouter(object):
    def db_for_read(self, model, **hints):
        if model.__name__ == 'SearchLog':
            return 'nominatim'
        elif model.__name__ == 'Article' \
            or model.__name__ == 'CustomPlace' \
            or model.__name__ == 'Annotation':
            return 'geoparser'
        else:
            return 'default'
    def db_for_write(self, model, **hints):
        if model.__name__ == 'SearchLog':
            return 'nominatim'
        elif model.__name__ == 'Article' \
                or model.__name__ == 'CustomPlace' \
                or model.__name__ == 'Annotation':
            return 'geoparser'
        else:
            return 'default'
    def allow_relation(self, obj1, obj2, **hints):
        return True