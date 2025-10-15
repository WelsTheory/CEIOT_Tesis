# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class Beam(models.Model):
    beamid = models.AutoField(db_column='beamId', primary_key=True)  # Field name made lowercase.
    fecha = models.DateTimeField(blank=True, null=True)
    valor_up = models.DecimalField(max_digits=2, decimal_places=1, blank=True, null=True)
    valor_down = models.DecimalField(max_digits=2, decimal_places=1, blank=True, null=True)
    modulo = models.ForeignKey('Modulos', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'Beam'
        unique_together = (('beamid', 'modulo'),)


class ControlReinicio(models.Model):
    resetid = models.AutoField(db_column='resetId', primary_key=True)  # Field name made lowercase.
    nombre = models.CharField(max_length=45, blank=True, null=True)
    moduloid = models.ForeignKey('Modulos', models.DO_NOTHING, db_column='moduloId', blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'Control_Reinicio'


class EstadoActualModulos(models.Model):
    moduloid = models.OneToOneField('Modulos', models.DO_NOTHING, db_column='moduloId', primary_key=True)  # Field name made lowercase.
    estado_conexion = models.CharField(max_length=11, blank=True, null=True)
    ultimo_heartbeat = models.DateTimeField(blank=True, null=True)
    proxima_verificacion = models.DateTimeField(blank=True, null=True)
    intentos_conexion = models.IntegerField(blank=True, null=True)
    tiempo_offline = models.IntegerField(blank=True, null=True)
    fecha_ultimo_cambio = models.DateTimeField(blank=True, null=True)
    alerta_activa = models.IntegerField(blank=True, null=True)
    nivel_alerta = models.CharField(max_length=7, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Estado_Actual_Modulos'


class EstadoConexion(models.Model):
    estadoid = models.AutoField(db_column='estadoId', primary_key=True)  # Field name made lowercase.
    moduloid = models.ForeignKey('Modulos', models.DO_NOTHING, db_column='moduloId')  # Field name made lowercase.
    tipo_evento = models.CharField(max_length=10)
    fecha = models.DateTimeField()
    duracion_desconexion = models.IntegerField(blank=True, null=True)
    detalles = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Estado_Conexion'


class InfoModulo(models.Model):
    infoid = models.AutoField(db_column='infoId', primary_key=True)  # Field name made lowercase.
    moduloid = models.ForeignKey('Modulos', models.DO_NOTHING, db_column='moduloId')  # Field name made lowercase.
    fecha_actualizacion = models.DateTimeField()
    version_firmware = models.CharField(max_length=50, blank=True, null=True)
    ip_address = models.CharField(max_length=45, blank=True, null=True)
    mac_address = models.CharField(max_length=17, blank=True, null=True)
    uptime = models.IntegerField(blank=True, null=True)
    memoria_libre = models.IntegerField(blank=True, null=True)
    temperatura_interna = models.DecimalField(max_digits=4, decimal_places=1, blank=True, null=True)
    voltaje_alimentacion = models.DecimalField(max_digits=4, decimal_places=2, blank=True, null=True)
    signal_strength = models.IntegerField(blank=True, null=True)
    activo = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Info_Modulo'
        unique_together = (('moduloid', 'activo'),)


class LogApuntes(models.Model):
    logapunteid = models.AutoField(db_column='logApunteId', primary_key=True)  # Field name made lowercase.
    moduloid = models.ForeignKey('Modulos', models.DO_NOTHING, db_column='moduloId')  # Field name made lowercase.
    fecha = models.DateTimeField()
    tipo_evento = models.CharField(max_length=12)
    valor_up_esperado = models.DecimalField(max_digits=2, decimal_places=1, blank=True, null=True)
    valor_down_esperado = models.DecimalField(max_digits=2, decimal_places=1, blank=True, null=True)
    valor_up_actual = models.DecimalField(max_digits=2, decimal_places=1, blank=True, null=True)
    valor_down_actual = models.DecimalField(max_digits=2, decimal_places=1, blank=True, null=True)
    estado = models.CharField(max_length=9, blank=True, null=True)
    descripcion = models.CharField(max_length=500, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Log_Apuntes'


class LogReinicios(models.Model):
    logresetid = models.AutoField(db_column='logResetId', primary_key=True)  # Field name made lowercase.
    reinicio = models.IntegerField(blank=True, null=True)
    fecha = models.DateTimeField(blank=True, null=True)
    resetid = models.ForeignKey(ControlReinicio, models.DO_NOTHING, db_column='resetId')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'Log_Reinicios'
        unique_together = (('logresetid', 'resetid'),)


class Mediciones(models.Model):
    medicionid = models.AutoField(db_column='medicionId', primary_key=True)  # Field name made lowercase.
    fecha = models.DateTimeField(blank=True, null=True)
    valor_temp = models.CharField(max_length=100, blank=True, null=True)
    valor_press = models.CharField(max_length=100, blank=True, null=True)
    moduloid = models.ForeignKey('Modulos', models.DO_NOTHING, db_column='moduloId')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'Mediciones'
        unique_together = (('medicionid', 'moduloid'),)


class Modulos(models.Model):
    moduloid = models.AutoField(db_column='moduloId', primary_key=True)  # Field name made lowercase.
    nombre = models.CharField(max_length=200, blank=True, null=True)
    ubicacion = models.CharField(max_length=5, blank=True, null=True)
    version = models.CharField(max_length=3, blank=True, null=True)
    up = models.DecimalField(max_digits=2, decimal_places=1, blank=True, null=True)
    down = models.DecimalField(max_digits=2, decimal_places=1, blank=True, null=True)
    temp_min = models.DecimalField(max_digits=4, decimal_places=1, blank=True, null=True)
    temp_max = models.DecimalField(max_digits=4, decimal_places=1, blank=True, null=True)
    press_min = models.DecimalField(max_digits=4, decimal_places=1, blank=True, null=True)
    press_max = models.DecimalField(max_digits=4, decimal_places=1, blank=True, null=True)
    resetid = models.ForeignKey(ControlReinicio, models.DO_NOTHING, db_column='resetId', blank=True, null=True)  # Field name made lowercase.
    intervalo_heartbeat = models.IntegerField(blank=True, null=True)
    timeout_maximo = models.IntegerField(blank=True, null=True)
    intentos_maximos = models.IntegerField(blank=True, null=True)
    notificaciones_activas = models.IntegerField(blank=True, null=True)
    fecha_ultima_actualizacion = models.DateTimeField(blank=True, null=True)
    estado_operativo = models.CharField(max_length=13, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Modulos'
