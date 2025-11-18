from django.urls import path

from . import views

urlpatterns = [
    path('locations/', views.LocationDataView.as_view(), name='locations'),
    path('custom-loading/', views.CustomLoadingView.as_view(), name='custom-loading'),
    path('materials/', views.MaterialsView.as_view(), name='materials'),
    path('geometry/validate/', views.GeometryValidationView.as_view(), name='geometry-validate'),
]
