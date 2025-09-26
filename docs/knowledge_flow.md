## Діаграма потоку запитань (Mermaid)

```mermaid
flowchart TD
    A[start: Для кого підбираємо одяг? ⇒ gender] --> B[garment_type: Тип одягу ⇒ garment (фільтр за gender)]
    B --> C[garment_fit: Фасон ⇒ fit (із вибраного garment)]

    %% Умовні переходи з garment_fit
    C -->|garment ∈ {g-1 "Сукня", g-3 "Спідниця"}| D[dress_length: Довжина ⇒ length]
    C -->|garment ∈ {g-2 "Блуза", g-8 "Сорочка", g-6 "Піджак/Жакет", g-9 "Пальто/Тренч"}| E[sleeve_type: Рукав ⇒ sleeve]
    C -->|інакше (default)| F[lining: Підкладка ⇒ lining]

    D --> F
    E --> F
    F --> G[style_and_season: Форма ⇒ style, season]
    G --> H[fabric_properties: Еластичність ⇒ stretch]
    H --> I[fabric_print: Складний візерунок ⇒ print_matching]
    I --> J[complexity_details: Складні елементи ⇒ has_complex_elements]
    J --> K[final_details: Форма мірок з garment.required_final_details ⇒ height/bust/hips]
    K --> R[RESULT]
```

## Правила розрахунку (умова → множник)

- height > 175 → x1.15
- fit === "Сонце-кльош" → x1.8
- bust > 100 → x1.2
- hips > 110 → x1.2
- sleeve === "довгий" → x1.25
- print_matching === "так" → x1.15
- has_complex_elements === "так" → x1.1


