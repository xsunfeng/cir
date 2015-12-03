from settings import DEBUG

class UserForumRoleRouter(object):
    def db_for_read(self, model, **hints):
        if DEBUG:
            if model.__name__ == 'Forum' \
                    or model.__name__ == 'User' \
                    or model.__name__ == 'Role'\
                    or model.__name__ == 'UserInfo' \
                    or model.__name__ == 'UserLogin':
                return 'default'
            return 'dev'
        else:
            return 'default'
    def db_for_write(self, model, **hints):
        if DEBUG:
            if model.__name__ == 'Forum' \
                    or model.__name__ == 'User' \
                    or model.__name__ == 'Role' \
                    or model.__name__ == 'UserInfo' \
                    or model.__name__ == 'UserLogin':
                return 'default'
            return 'dev'
        else:
            return 'default'
    def allow_relation(self, obj1, obj2, **hints):
        return True
