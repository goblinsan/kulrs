/// Model representing a color palette
class Palette {
  final String? id;
  final String? name;
  final List<PaletteColor> colors;
  final String? userId;
  final String? parentId;
  final bool isPublic;
  final int likesCount;
  final bool? isLiked;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const Palette({
    this.id,
    this.name,
    required this.colors,
    this.userId,
    this.parentId,
    this.isPublic = false,
    this.likesCount = 0,
    this.isLiked,
    this.createdAt,
    this.updatedAt,
  });

  factory Palette.fromJson(Map<String, dynamic> json) {
    return Palette(
      id: json['id'] as String?,
      name: json['name'] as String?,
      colors: (json['colors'] as List<dynamic>?)
              ?.map((c) => PaletteColor.fromJson(c as Map<String, dynamic>))
              .toList() ??
          [],
      userId: json['userId'] as String?,
      parentId: json['parentId'] as String?,
      isPublic: json['isPublic'] as bool? ?? false,
      likesCount: json['likesCount'] as int? ?? 0,
      isLiked: json['isLiked'] as bool?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      'colors': colors.map((c) => c.toJson()).toList(),
      if (userId != null) 'userId': userId,
      if (parentId != null) 'parentId': parentId,
      'isPublic': isPublic,
      'likesCount': likesCount,
      if (isLiked != null) 'isLiked': isLiked,
      if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
      if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
    };
  }

  Palette copyWith({
    String? id,
    String? name,
    List<PaletteColor>? colors,
    String? userId,
    String? parentId,
    bool? isPublic,
    int? likesCount,
    bool? isLiked,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Palette(
      id: id ?? this.id,
      name: name ?? this.name,
      colors: colors ?? this.colors,
      userId: userId ?? this.userId,
      parentId: parentId ?? this.parentId,
      isPublic: isPublic ?? this.isPublic,
      likesCount: likesCount ?? this.likesCount,
      isLiked: isLiked ?? this.isLiked,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

/// Model representing a color in a palette
class PaletteColor {
  final String hex;
  final String? name;
  final OKLCHColor? oklch;

  const PaletteColor({
    required this.hex,
    this.name,
    this.oklch,
  });

  factory PaletteColor.fromJson(Map<String, dynamic> json) {
    return PaletteColor(
      hex: json['hex'] as String,
      name: json['name'] as String?,
      oklch: json['oklch'] != null
          ? OKLCHColor.fromJson(json['oklch'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'hex': hex,
      if (name != null) 'name': name,
      if (oklch != null) 'oklch': oklch!.toJson(),
    };
  }
}

/// Model representing an OKLCH color
class OKLCHColor {
  final double l;
  final double c;
  final double h;
  final double? alpha;

  const OKLCHColor({
    required this.l,
    required this.c,
    required this.h,
    this.alpha,
  });

  factory OKLCHColor.fromJson(Map<String, dynamic> json) {
    return OKLCHColor(
      l: (json['l'] as num).toDouble(),
      c: (json['c'] as num).toDouble(),
      h: (json['h'] as num).toDouble(),
      alpha: json['alpha'] != null ? (json['alpha'] as num).toDouble() : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'l': l,
      'c': c,
      'h': h,
      if (alpha != null) 'alpha': alpha,
    };
  }
}
