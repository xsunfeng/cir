# open manage.py shell
# then: from cir.models import *

src_forum = Forum.objects.get(id=28)
new_url = 'tax2'

new_forum = Forum(
    full_name=src_forum.full_name,
    short_name=src_forum.short_name,
    url=new_url,
    description=src_forum.description,
    access_level=src_forum.access_level,
    phase=src_forum.phase,
    contextmap=src_forum.contextmap,
    forum_logo=src_forum.forum_logo,
    stmt_preamble=src_forum.stmt_preamble
    )
new_forum.save()

for old_doc in Doc.objects.filter(forum=src_forum):
    new_doc = Doc(forum=new_forum,
        title=old_doc.title,
        description=old_doc.description,
        )
    new_doc.save()
    for old_docsection in DocSection.objects.filter(doc=old_doc):
        DocSection.objects.create(
            forum=new_forum,
            author=User.objects.get(id=16),
            content=old_docsection.content,
            created_at=old_docsection.created_at,
            updated_at=old_docsection.updated_at,
            title=old_docsection.title,
            doc=new_doc
        )

for theme in ClaimTheme.objects.filter(forum=src_forum):
    ClaimTheme.objects.create(
        forum=new_forum,
        name=theme.name,
        description=theme.description
    )
