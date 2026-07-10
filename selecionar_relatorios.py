"""
selecionar_relatorios.py
=========================
Menu interativo no terminal para escolher quais relatórios/coletas o
dashboard.py deve buscar na API Nexus. A escolha fica salva em
relatorios_config.json (na mesma pasta) e é usada automaticamente pelo
dashboard.py em todas as execuções seguintes.

Rode:
    python selecionar_relatorios.py

Também é chamado automaticamente se você rodar:
    python dashboard.py --selecionar
"""

from registry import REPORT_REGISTRY, CONFIG_PATH, load_config, save_config


def montar_menu(config: dict) -> dict:
    print("\n" + "=" * 70)
    print("SELEÇÃO DE RELATÓRIOS - API NEXUS")
    print("=" * 70)

    categorias: dict = {}
    for item in REPORT_REGISTRY:
        categorias.setdefault(item["categoria"], []).append(item)

    indice_map = {}
    n = 1
    for categoria, itens in categorias.items():
        print(f"\n-- {categoria} --")
        for item in itens:
            ativo = config.get(item["id"], True)
            marca = "[X]" if ativo else "[ ]"
            lento = "  (pode ser lento)" if item.get("lento") else ""
            print(f"  {n:>2}. {marca} {item['label']}{lento}")
            indice_map[n] = item["id"]
            n += 1
    return indice_map


def main():
    config = load_config()

    while True:
        indice_map = montar_menu(config)
        print("\nDigite os números para ALTERNAR (ativar/desativar), separados por vírgula.")
        print("Ex: 2,5,9   |   'tudo' = ativa todos   |   'nenhum' = desativa todos")
        print("ENTER em branco = salvar e sair")
        escolha = input("\n> ").strip().lower()

        if escolha == "":
            break
        if escolha == "tudo":
            for item in REPORT_REGISTRY:
                config[item["id"]] = True
            continue
        if escolha == "nenhum":
            for item in REPORT_REGISTRY:
                config[item["id"]] = False
            continue

        try:
            numeros = [int(x.strip()) for x in escolha.split(",") if x.strip()]
        except ValueError:
            print("\n⚠️  Entrada inválida — use números separados por vírgula (ex: 1,3,7).")
            continue

        for num in numeros:
            item_id = indice_map.get(num)
            if item_id is None:
                print(f"⚠️  Número {num} não existe, ignorado.")
                continue
            config[item_id] = not config.get(item_id, True)

    save_config(config)
    print(f"\n✅ Configuração salva em: {CONFIG_PATH.resolve()}")
    print("Agora rode 'python dashboard.py' normalmente — ele vai respeitar essa seleção.\n")


if __name__ == "__main__":
    main()
