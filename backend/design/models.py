from django.db import models


class LocationRecord(models.Model):
	state = models.CharField(max_length=128)
	district = models.CharField(max_length=128)
	basic_wind_speed = models.FloatField(null=True, blank=True)
	seismic_zone = models.CharField(max_length=8, blank=True)
	seismic_factor = models.FloatField(null=True, blank=True)
	max_temp = models.FloatField(null=True, blank=True)
	min_temp = models.FloatField(null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		unique_together = ('state', 'district')
		ordering = ['state', 'district']

	def __str__(self) -> str:  # pragma: no cover - debug helper
		return f'{self.state} - {self.district}'


class MaterialCatalog(models.Model):
	CATEGORY_CHOICES = (
		('girder_steel', 'Girder steel'),
		('cross_bracing_steel', 'Cross bracing steel'),
		('deck_concrete', 'Deck concrete'),
	)

	category = models.CharField(max_length=32, choices=CATEGORY_CHOICES)
	grade = models.CharField(max_length=32)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		unique_together = ('category', 'grade')
		ordering = ['category', 'grade']

	def __str__(self) -> str:  # pragma: no cover - debug helper
		return f'{self.category}: {self.grade}'
