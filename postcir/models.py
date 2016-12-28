from django.db import models

from cir.models import Forum

# Create your models here.

class StatementCategory(models.Model):
    CATEGORY_CHOICES = (
        ('pro', 'Proponent'),
        ('con', 'Opponent'),
        ('finding', 'Key Finding')
    )
    name = models.CharField(max_length=10, choices=CATEGORY_CHOICES)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now=True)
    forum = models.ForeignKey(Forum, on_delete=models.CASCADE)

    def __str__(self):
        return "%s (%s)" % (self.description, self.name)

class StatementGroup(models.Model):
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now=True)
    category = models.ForeignKey(StatementCategory, on_delete=models.CASCADE)
    forum = models.ForeignKey(Forum, on_delete=models.CASCADE)

    def __unicode__(self):
        if len(self.description) > 50:
            short_desc = self.description[:50]
        else:
            short_desc = self.description
        return "(%s) %s" % (self.category.name, short_desc)

class StatementItem(models.Model):
    content = models.TextField()
    created_at = models.DateTimeField(auto_now=True)
    updated_at = models.DateTimeField(auto_now_add=True)
    group = models.ForeignKey(StatementGroup, related_name='items', on_delete=models.CASCADE)