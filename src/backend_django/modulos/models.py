# modulos/models.py

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone

class ControlReinicio(models.Model):
    """Tabla Control_Reinicio"""
    reset_id = models.AutoField(primary_key=True, db_column='resetId')
    nombre = models.CharField(max_length=45, null=True, blank=True)
    modulo = models.ForeignKey(
        'Modulo', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        db_column='moduloId',
        related_name='controles_reinicio'
    )
    
    class Meta:
        db_table = 'Control_Reinicio'
        verbose_name = 'Control de Reinicio'
        verbose_name_plural = 'Controles de Reinicio'
    
    def __str__(self):
        return f"{self.nombre} (Reset ID: {self.reset_id})"


class Modulo(models.Model):
    """Tabla Modulos"""
    UBICACIONES = [
        ('Norte', 'Norte'),
        ('Sur', 'Sur'),
        ('Este', 'Este'),
        ('Oeste', 'Oeste'),
    ]
    
    VERSIONES = [
        ('1.0', '1.0'),
        ('2.0', '2.0'),
    ]
    
    VALORES_APUNTE = [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5]
    
    modulo_id = models.AutoField(primary_key=True, db_column='moduloId')
    nombre = models.CharField(max_length=200, null=True, blank=True)
    ubicacion = models.CharField(max_length=5, choices=UBICACIONES, null=True, blank=True)
    version = models.CharField(max_length=3, choices=VERSIONES, default='1.0')
    
    up = models.DecimalField(
        max_digits=2, 
        decimal_places=1, 
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(3.5)]
    )
    down = models.DecimalField(
        max_digits=2, 
        decimal_places=1, 
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(3.5)]
    )
    
    reset = models.ForeignKey(
        ControlReinicio,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='resetId',
        related_name='modulos'
    )
    
    class Meta:
        db_table = 'Modulos'
        verbose_name = 'Módulo'
        verbose_name_plural = 'Módulos'
    
    def __str__(self):
        return f"{self.nombre} - {self.ubicacion}"


class Medicion(models.Model):
    """Tabla Mediciones"""
    medicion_id = models.AutoField(primary_key=True, db_column='medicionId')
    fecha = models.DateTimeField(auto_now_add=True)
    valor_temp = models.CharField(max_length=100, null=True, blank=True)
    valor_press = models.CharField(max_length=100, null=True, blank=True)
    modulo = models.ForeignKey(
        Modulo,
        on_delete=models.CASCADE,
        db_column='moduloId',
        related_name='mediciones'
    )
    
    class Meta:
        db_table = 'Mediciones'
        verbose_name = 'Medición'
        verbose_name_plural = 'Mediciones'
        ordering = ['-fecha']
    
    def __str__(self):
        return f"Medición {self.medicion_id} - Módulo {self.modulo.nombre}"


class Beam(models.Model):
    """Tabla Beam (Apuntes)"""
    beam_id = models.AutoField(primary_key=True, db_column='beamId')
    fecha = models.DateTimeField(auto_now_add=True)
    valor_up = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(3.5)]
    )
    valor_down = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(3.5)]
    )
    modulo = models.ForeignKey(
        Modulo,
        on_delete=models.CASCADE,
        db_column='modulo_id',
        related_name='apuntes'
    )
    
    class Meta:
        db_table = 'Beam'
        verbose_name = 'Apunte'
        verbose_name_plural = 'Apuntes'
        ordering = ['-fecha']
    
    def __str__(self):
        return f"Apunte {self.beam_id} - UP:{self.valor_up} DOWN:{self.valor_down}"


class LogReinicio(models.Model):
    """Tabla Log_Reinicios"""
    log_reset_id = models.AutoField(primary_key=True, db_column='logResetId')
    reinicio = models.SmallIntegerField(null=True, blank=True)
    fecha = models.DateTimeField(auto_now_add=True)
    reset = models.ForeignKey(
        ControlReinicio,
        on_delete=models.CASCADE,
        db_column='resetId',
        related_name='logs'
    )
    
    class Meta:
        db_table = 'Log_Reinicios'
        verbose_name = 'Log de Reinicio'
        verbose_name_plural = 'Logs de Reinicios'
        ordering = ['-fecha']


class EstadoConexion(models.Model):
    """Tabla Estado_Conexion"""
    TIPOS_EVENTO = [
        ('ONLINE', 'Online'),
        ('OFFLINE', 'Offline'),
        ('TIMEOUT', 'Timeout'),
        ('RECONEXION', 'Reconexión'),
    ]
    
    estado_id = models.AutoField(primary_key=True, db_column='estadoId')
    modulo = models.ForeignKey(
        Modulo,
        on_delete=models.CASCADE,
        db_column='moduloId',
        related_name='estados_conexion'
    )
    tipo_evento = models.CharField(max_length=10, choices=TIPOS_EVENTO)
    fecha = models.DateTimeField(auto_now_add=True)
    duracion_desconexion = models.IntegerField(null=True, blank=True, help_text='Duración en segundos')
    detalles = models.TextField(null=True, blank=True)
    
    class Meta:
        db_table = 'Estado_Conexion'
        verbose_name = 'Estado de Conexión'
        verbose_name_plural = 'Estados de Conexión'
        ordering = ['-fecha']
        indexes = [
            models.Index(fields=['modulo', 'fecha']),
            models.Index(fields=['tipo_evento']),
        ]


class InfoModulo(models.Model):
    """Tabla Info_Modulo"""
    info_id = models.AutoField(primary_key=True, db_column='infoId')
    modulo = models.ForeignKey(
        Modulo,
        on_delete=models.CASCADE,
        db_column='moduloId',
        related_name='info_tecnica'
    )
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    version_firmware = models.CharField(max_length=50, null=True, blank=True)
    ip_address = models.CharField(max_length=45, null=True, blank=True)
    mac_address = models.CharField(max_length=17, null=True, blank=True)
    uptime = models.IntegerField(null=True, blank=True, help_text='Segundos')
    memoria_libre = models.IntegerField(null=True, blank=True, help_text='Bytes')
    temperatura_interna = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    voltaje_alimentacion = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    signal_strength = models.IntegerField(null=True, blank=True, help_text='dBm')
    activo = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'Info_Modulo'
        verbose_name = 'Información de Módulo'
        verbose_name_plural = 'Información de Módulos'
        indexes = [
            models.Index(fields=['modulo', 'fecha_actualizacion']),
        ]

# Agregar al archivo src/backend_django/modulos/models.py

class Notificacion(models.Model):
    """
    Modelo para almacenar notificaciones del sistema
    """
    TIPO_CHOICES = [
        ('info', 'Información'),
        ('warning', 'Advertencia'),
        ('error', 'Error'),
        ('success', 'Éxito'),
    ]
    
    CATEGORIA_CHOICES = [
        ('sistema', 'Sistema'),
        ('modulo', 'Módulo'),
        ('alerta', 'Alerta'),
        ('medicion', 'Medición'),
        ('control', 'Control'),
    ]
    
    notificacion_id = models.AutoField(primary_key=True)
    usuario = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='notificaciones')
    modulo = models.ForeignKey('Modulo', on_delete=models.CASCADE, null=True, blank=True, related_name='notificaciones')
    
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='info')
    categoria = models.CharField(max_length=20, choices=CATEGORIA_CHOICES, default='sistema')
    
    titulo = models.CharField(max_length=200)
    mensaje = models.TextField()
    
    leida = models.BooleanField(default=False)
    importante = models.BooleanField(default=False)
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_leida = models.DateTimeField(null=True, blank=True)
    
    # Datos adicionales en JSON (opcional)
    datos_extra = models.JSONField(null=True, blank=True)
    
    class Meta:
        db_table = 'Notificaciones'
        ordering = ['-fecha_creacion']
        indexes = [
            models.Index(fields=['-fecha_creacion']),
            models.Index(fields=['usuario', 'leida']),
        ]
    
    def __str__(self):
        return f"{self.titulo} - {self.tipo}"
    
    def marcar_como_leida(self):
        """Marca la notificación como leída"""
        if not self.leida:
            self.leida = True
            self.fecha_leida = timezone.now()
            self.save()
    
    @classmethod
    def crear_notificacion_modulo(cls, usuario, modulo, tipo, titulo, mensaje, importante=False):
        """Helper para crear notificaciones de módulos"""
        return cls.objects.create(
            usuario=usuario,
            modulo=modulo,
            tipo=tipo,
            categoria='modulo',
            titulo=titulo,
            mensaje=mensaje,
            importante=importante
        )
    
    @classmethod
    def crear_alerta(cls, usuario, modulo, mensaje, importante=True):
        """Helper para crear alertas"""
        return cls.objects.create(
            usuario=usuario,
            modulo=modulo,
            tipo='warning',
            categoria='alerta',
            titulo=f'Alerta: {modulo.nombre if modulo else "Sistema"}',
            mensaje=mensaje,
            importante=importante
        )
    
class Cuadrante(models.Model):
    nombre = models.CharField(max_length=50)
    descripcion = models.TextField(blank=True)
    
    class Meta:
        verbose_name_plural = 'Cuadrantes'
    
    def __str__(self):
        return f"Cuadrante {self.nombre}"


class Modulo(models.Model):
    nombre = models.CharField(max_length=100)
    ubicacion = models.CharField(max_length=200)
    cuadrante = models.ForeignKey(
        Cuadrante, 
        on_delete=models.CASCADE, 
        related_name='modulos'
    )
    # ... otros campos ...


class Medida(models.Model):
    modulo = models.ForeignKey(
        Modulo, 
        on_delete=models.CASCADE, 
        related_name='medidas'
    )
    temperatura = models.FloatField()
    presion = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
